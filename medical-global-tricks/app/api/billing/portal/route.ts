import { handler, json, HttpError } from '@/lib/http';
import { requireUser } from '@/lib/auth';
import { one } from '@/lib/db';
import { paymentsEnabled } from '@/lib/catalog';
import { stripe } from '@/lib/payments/stripe';

export const POST = handler(async () => {
  if (!paymentsEnabled()) throw new HttpError(503, 'payments_disabled');
  const user = await requireUser();
  const row = await one('SELECT stripe_customer_id FROM users WHERE id = $1', [user.id]);
  if (!row?.stripe_customer_id) throw new HttpError(404, 'no_customer');
  const s = await stripe().billingPortal.sessions.create({ customer: row.stripe_customer_id, return_url: `${process.env.APP_BASE_URL}/account` });
  return json({ url: s.url });
});
