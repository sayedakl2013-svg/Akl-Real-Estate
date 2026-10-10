import 'server-only';
import Stripe from 'stripe';
import { one, q, tx } from '../db';
import { audit } from '../audit';

let client: Stripe | null = null;
export function stripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error('Stripe is not configured');
  client ??= new Stripe(process.env.STRIPE_SECRET_KEY, { maxNetworkRetries: 2, timeout: 20_000 });
  return client;
}

type Fulfil = { orderId: string; amountTotal: number | null; currency: string | null; paymentId?: string | null; subscriptionId?: string | null; periodEnd?: number | null };

/**
 * Grants access for a paid order. Only ever called from a signature-verified webhook,
 * never from the browser's return to the success page. Idempotent.
 */
export async function fulfilOrder(f: Fulfil) {
  await tx(async (c) => {
    const { rows: [order] } = await c.query(
      `SELECT o.*, co.access_days, co.interval, co.interval_count FROM orders o
         LEFT JOIN course_offers co ON co.id = o.offer_id WHERE o.id = $1 FOR UPDATE OF o`, [f.orderId]);
    if (!order) throw new Error(`order ${f.orderId} not found`);
    if (f.amountTotal !== null && (f.amountTotal !== order.amount_minor || (f.currency ?? '').toLowerCase() !== order.currency)) {
      throw new Error(`amount mismatch for order ${order.id}: got ${f.amountTotal} ${f.currency}, expected ${order.amount_minor} ${order.currency}`);
    }
    if (order.status !== 'paid') {
      await c.query(`UPDATE orders SET status = 'paid', paid_at = now(), gateway_payment_id = COALESCE($2, gateway_payment_id),
        gateway_subscription_id = COALESCE($3, gateway_subscription_id) WHERE id = $1`, [order.id, f.paymentId ?? null, f.subscriptionId ?? null]);
    }
    const { rows: [existing] } = await c.query('SELECT id FROM enrollments WHERE order_id = $1', [order.id]);
    if (order.kind === 'one_time') {
      if (!existing) {
        await c.query(
          `INSERT INTO enrollments(user_id, course_id, source, status, expires_at, order_id)
           VALUES ($1,$2,'one_time','active', CASE WHEN $3::int IS NULL THEN NULL ELSE now() + make_interval(days => $3::int) END, $4)`,
          [order.user_id, order.course_id, order.access_days, order.id]);
      }
    } else {
      // Subscription: access runs to the end of the paid period (from the invoice), or a provisional
      // interval + 2 days until invoice.paid confirms the exact period end.
      const periodEnd = f.periodEnd ? new Date(f.periodEnd * 1000) : null;
      if (existing) {
        await c.query(`UPDATE enrollments SET status = 'active', expires_at = GREATEST(expires_at, COALESCE($2, expires_at)),
          gateway_subscription_id = COALESCE(gateway_subscription_id, $3), updated_at = now() WHERE id = $1`, [existing.id, periodEnd, f.subscriptionId ?? null]);
      } else {
        await c.query(
          `INSERT INTO enrollments(user_id, course_id, source, status, expires_at, order_id, gateway_subscription_id)
           VALUES ($1,$2,'subscription','active',
             COALESCE($3, now() + make_interval(months => CASE WHEN $4 = 'year' THEN 12 ELSE 1 END * $5::int) + interval '2 days'), $6, $7)`,
          [order.user_id, order.course_id, periodEnd, order.interval, order.interval_count, order.id, f.subscriptionId ?? null]);
      }
    }
  });
  await audit(null, 'order_paid', 'order', f.orderId, { subscription: f.subscriptionId ?? null });
}

export async function renewSubscription(subscriptionId: string, periodEnd: number) {
  await q(`UPDATE enrollments SET status = 'active', expires_at = to_timestamp($2), updated_at = now()
            WHERE gateway_subscription_id = $1 AND status <> 'refunded'`, [subscriptionId, periodEnd]);
}

export async function syncSubscriptionStatus(sub: Stripe.Subscription) {
  const periodEnd = (sub as any).current_period_end ?? (sub.items?.data?.[0] as any)?.current_period_end ?? null;
  let status: string;
  if (sub.status === 'active' || sub.status === 'trialing') status = sub.cancel_at_period_end ? 'canceled' : 'active';
  else if (sub.status === 'past_due' || sub.status === 'unpaid' || sub.status === 'incomplete') status = 'past_due';
  else status = 'expired'; // canceled / incomplete_expired
  await q(
    `UPDATE enrollments SET status = $2,
       expires_at = CASE WHEN $2 = 'expired' THEN LEAST(COALESCE(expires_at, now()), now()) WHEN $3::bigint IS NOT NULL THEN to_timestamp($3::bigint) ELSE expires_at END,
       updated_at = now()
     WHERE gateway_subscription_id = $1 AND status <> 'refunded'`,
    [sub.id, status, periodEnd]);
}

export async function markRefund(paymentIntentId: string, full: boolean) {
  const order = await one(`UPDATE orders SET status = $2, refunded_at = now() WHERE gateway_payment_id = $1 RETURNING id`,
    [paymentIntentId, full ? 'refunded' : 'partially_refunded']);
  // Policy: a full refund ends access; a partial refund keeps it (adjust in docs/PAYMENTS.md if needed).
  if (order && full) await q(`UPDATE enrollments SET status = 'refunded', updated_at = now() WHERE order_id = $1`, [order.id]);
  if (order) await audit(null, full ? 'order_refunded' : 'order_partially_refunded', 'order', order.id);
}
