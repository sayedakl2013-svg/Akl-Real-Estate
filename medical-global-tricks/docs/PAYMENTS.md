# Payments

## Gateway choice

**Primary: Stripe.** Stripe Checkout (hosted) is already integrated. It covers one-time course purchases and recurring subscriptions, cards (Visa / Mastercard, local and international), Apple Pay and Google Pay (turned on in the Stripe Dashboard → *Payment methods*; with hosted Checkout, no domain verification is needed), and presentment in many currencies. Card data never touches our servers: Checkout is hosted by Stripe, which handles PCI-DSS compliance. Our side is limited to the redirect and webhooks.

**Before going live, confirm eligibility with Stripe directly.** Do this during onboarding at stripe.com/ae, for the company's exact legal form: a SHAMS (Sharjah Media City) free-zone licence, an AED settlement bank account in the company's name, and the supported business category (online education). This document doesn't confirm eligibility. Only Stripe's onboarding review can.

**Secondary (if needed): PayTabs or Tap Payments.** These help if you want Egypt- or GCC-specific local methods (for example Meeza / Fawry in Egypt, or mada / KNET in the Gulf) that Stripe doesn't offer. They would be a second adapter alongside `lib/payments/stripe.ts` with the same rule: grant access only from a verified server-to-server notification. Check each provider's current coverage, free-zone acceptance, settlement currency and fees directly with them.

## Setup steps (Stripe)

1. Finish Stripe account activation for the company and connect the UAE bank account for settlement.
2. Dashboard → Developers → API keys: copy the **secret key** into `STRIPE_SECRET_KEY`. Use the test key first.
3. Dashboard → Developers → Webhooks → *Add endpoint*: `https://<your-domain>/api/webhooks/stripe`. Select these events:
   - `checkout.session.completed`
   - `checkout.session.async_payment_succeeded`
   - `checkout.session.async_payment_failed`
   - `checkout.session.expired`
   - `invoice.paid`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `charge.refunded`

   Copy the signing secret into `STRIPE_WEBHOOK_SECRET`.
4. Turn on Apple Pay and Google Pay under *Payment methods*. Configure the *Customer portal* (cancel and update payment method), which the "Manage subscription" button uses.
5. In **Admin → Courses → (course) → Offers**, enter the real prices: a one-time offer (optional access days) and/or a monthly or yearly subscription. Nothing is for sale until an offer exists, the course is *available*, and both Stripe variables are set.
6. Test end to end in test mode with Stripe's test cards, including a refund and a subscription cancellation. Then switch to live keys.

## How activation works

```
Student → POST /api/checkout → order row (pending) → Stripe Checkout
Stripe → POST /api/webhooks/stripe (signed) → verify signature → store event id (idempotency)
       → checkout.session.completed with payment_status = paid
       → amount + currency must match the order → order = paid → enrollment created
```

- Coming back to `/courses/<slug>?checkout=success` **doesn't grant access**. The page only says activation is pending.
- Each event is stored in `payment_events`. A redelivered event is acknowledged without being processed again.
- If processing fails (for example an amount mismatch), the endpoint returns 500 and records the error. Stripe then retries, and the error shows in Admin → Orders.

## Renewal, cancellation, expiry, refunds

| Event | Effect |
|---|---|
| `invoice.paid` | Sets access to the end of the paid period. It also covers the first invoice arriving before `checkout.session.completed` |
| `customer.subscription.updated` with `cancel_at_period_end` | Status `canceled`, access continues to period end |
| `customer.subscription.updated` → `past_due` / `unpaid` | Access paused until payment succeeds |
| `customer.subscription.deleted` | Access ends |
| `charge.refunded` (full) | Order `refunded`, access ends. Partial refunds keep access (change in `markRefund` if your policy differs) |
| One-time offer with access days | Access ends at `expires_at`. `scripts/maintenance.mjs` marks it expired for reports |

All of this is covered by `tests/e2e.mjs` using locally signed webhook payloads.

## Fees and limits

Gateway fees depend on card origin (domestic vs international), currency conversion and payment method. Read the current price list at stripe.com/ae/pricing, or in each alternative provider's contract. This document deliberately doesn't quote numbers.
