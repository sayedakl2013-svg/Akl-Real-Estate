import { handler, json, readJson, int, HttpError } from '@/lib/http';
import { requireUser } from '@/lib/auth';
import { courseAccess } from '@/lib/access';
import { one, q } from '@/lib/db';
import { paymentsEnabled } from '@/lib/catalog';
import { stripe } from '@/lib/payments/stripe';
import { rateLimit } from '@/lib/ratelimit';

export const POST = handler(async (req) => {
  if (!paymentsEnabled()) throw new HttpError(503, 'payments_disabled');
  const user = await requireUser();
  if (!user.emailVerified) throw new HttpError(403, 'email_not_verified');
  await rateLimit(`checkout:${user.id}`, 10, 3600);
  const { offerId } = await readJson(req);
  const offer = await one(
    `SELECT o.*, c.slug, c.title_en, c.status AS course_status FROM course_offers o JOIN courses c ON c.id = o.course_id
      WHERE o.id = $1 AND o.active`, [int(offerId)]);
  if (!offer || offer.course_status !== 'available') throw new HttpError(404, 'not_found');
  if ((await courseAccess(user, offer.course_id)).enrollment) throw new HttpError(409, 'already_enrolled');

  const order = await one<{ id: string }>(
    `INSERT INTO orders(user_id, course_id, offer_id, kind, amount_minor, currency) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
    [user.id, offer.course_id, offer.id, offer.kind, offer.amount_minor, offer.currency]);

  const s = stripe();
  let customer = (await one('SELECT stripe_customer_id FROM users WHERE id = $1', [user.id]))?.stripe_customer_id as string | null;
  if (!customer) {
    customer = (await s.customers.create({ email: user.email, name: user.name, metadata: { user_id: user.id } })).id;
    await q('UPDATE users SET stripe_customer_id = $2 WHERE id = $1', [user.id, customer]);
  }
  const base = (process.env.APP_BASE_URL ?? '').replace(/\/$/, '');
  const metadata = { order_id: order!.id, user_id: user.id, course_id: String(offer.course_id), offer_id: String(offer.id) };
  const priceData = {
    currency: offer.currency,
    unit_amount: offer.amount_minor,
    product_data: { name: `${offer.title_en} — ${offer.label_en}` },
    ...(offer.kind === 'subscription' ? { recurring: { interval: offer.interval, interval_count: offer.interval_count } } : {}),
  };
  const session = await s.checkout.sessions.create({
    mode: offer.kind === 'subscription' ? 'subscription' : 'payment',
    customer,
    client_reference_id: order!.id,
    line_items: [{ price_data: priceData as any, quantity: 1 }],
    metadata,
    ...(offer.kind === 'subscription' ? { subscription_data: { metadata } } : { payment_intent_data: { metadata } }),
    success_url: `${base}/courses/${offer.slug}?checkout=success`,
    cancel_url: `${base}/courses/${offer.slug}?checkout=cancelled`,
    locale: user.locale === 'ar' ? 'auto' : 'en',
  }, { idempotencyKey: `order-${order!.id}` });
  await q('UPDATE orders SET gateway_session_id = $2 WHERE id = $1', [order!.id, session.id]);
  return json({ url: session.url });
});
