import type Stripe from 'stripe';
import { one, q } from '@/lib/db';
import { fulfilOrder, markRefund, renewSubscription, stripe, syncSubscriptionStatus } from '@/lib/payments/stripe';

export const runtime = 'nodejs';

// Stripe → us. Access is granted here, after signature verification, and nowhere else.
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !process.env.STRIPE_SECRET_KEY) return new Response('not configured', { status: 503 });
  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(raw, req.headers.get('stripe-signature') ?? '', secret);
  } catch {
    return new Response('bad signature', { status: 400 });
  }
  const seen = await one(`INSERT INTO payment_events(id, gateway, type, payload) VALUES ($1,'stripe',$2,$3)
    ON CONFLICT (id) DO UPDATE SET id = EXCLUDED.id RETURNING processed_at`, [event.id, event.type, raw]);
  if (seen?.processed_at) return Response.json({ received: true, duplicate: true });

  try {
    await handle(event);
    await q('UPDATE payment_events SET processed_at = now(), error = NULL WHERE id = $1', [event.id]);
    return Response.json({ received: true });
  } catch (e: any) {
    console.error('[stripe webhook]', event.type, e);
    await q('UPDATE payment_events SET error = $2 WHERE id = $1', [event.id, String(e?.message ?? e)]);
    return new Response('processing failed', { status: 500 }); // Stripe retries with backoff
  }
}

const subIdOf = (inv: any): string | null =>
  (typeof inv.subscription === 'string' ? inv.subscription : inv.subscription?.id) ?? inv.parent?.subscription_details?.subscription ?? null;
const subMetaOf = (inv: any): Record<string, string> =>
  inv.subscription_details?.metadata ?? inv.parent?.subscription_details?.metadata ?? {};

async function handle(event: Stripe.Event) {
  switch (event.type) {
    case 'checkout.session.completed':
    case 'checkout.session.async_payment_succeeded': {
      const s = event.data.object as Stripe.Checkout.Session;
      const orderId = s.metadata?.order_id ?? s.client_reference_id;
      if (!orderId) return;
      // Card payments arrive as 'paid'. Delayed methods stay 'unpaid' until async_payment_succeeded.
      if (s.payment_status !== 'paid' && s.payment_status !== 'no_payment_required') return;
      await fulfilOrder({
        orderId, amountTotal: s.amount_total, currency: s.currency,
        paymentId: typeof s.payment_intent === 'string' ? s.payment_intent : s.payment_intent?.id ?? null,
        subscriptionId: typeof s.subscription === 'string' ? s.subscription : s.subscription?.id ?? null,
      });
      return;
    }
    case 'checkout.session.async_payment_failed':
    case 'checkout.session.expired': {
      const s = event.data.object as Stripe.Checkout.Session;
      const orderId = s.metadata?.order_id ?? s.client_reference_id;
      if (orderId) await q(`UPDATE orders SET status = $2 WHERE id = $1 AND status = 'pending'`, [orderId, event.type.endsWith('expired') ? 'expired' : 'failed']);
      return;
    }
    case 'invoice.paid': {
      const inv = event.data.object as any;
      const subId = subIdOf(inv);
      if (!subId) return;
      const periodEnd = Math.max(...(inv.lines?.data ?? []).map((l: any) => l.period?.end ?? 0), 0) || null;
      const orderId = subMetaOf(inv).order_id;
      if (orderId) {
        // Covers the first invoice even if it arrives before checkout.session.completed.
        await fulfilOrder({ orderId, amountTotal: null, currency: null, subscriptionId: subId, periodEnd });
      } else if (periodEnd) {
        await renewSubscription(subId, periodEnd);
      }
      return;
    }
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      await syncSubscriptionStatus(event.data.object as Stripe.Subscription);
      return;
    case 'charge.refunded': {
      const ch = event.data.object as Stripe.Charge;
      const pi = typeof ch.payment_intent === 'string' ? ch.payment_intent : ch.payment_intent?.id;
      if (pi) await markRefund(pi, ch.amount_refunded >= ch.amount);
      return;
    }
    default:
      return; // stored for the audit trail, nothing to do
  }
}
