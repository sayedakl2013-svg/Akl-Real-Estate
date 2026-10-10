# Scaling to 25,000 concurrent examinees

**Status: designed for this target, not yet proven.** Capacity can't be claimed from server specifications. You only have proof once one of these exists:

1. a load test at full scale on an environment identical to production (same instance types, database tier, pooler and CDN), using `tests/load/exam-burst.js` or equivalent, with the thresholds below met; or
2. a written commitment from the hosting provider that covers **this application** (not only their infrastructure), backed by their own test.

Until then, treat 25,000 as a design target.

## Load model (to validate)

| Phase | Shape | Rough rate at 25k users |
|---|---|---|
| Mass start | Everyone presses *Start* within 1–2 minutes | ≈ 200–400 attempt creations/s; each inserts one attempt + N item rows |
| Answering | One reveal + one rating per question, every 15–45 s per student; notes are debounced (800 ms) | ≈ 1,000–2,000 small writes/s |
| Submit | Clustered at the deadline | Bursts of several hundred/s |
| Reading | Question payload is fetched once at attempt start | Low |

Each autosave is: a session lookup (indexed by token hash), one attempt read, one single-row `UPDATE`, and, for ratings, an upsert + an event insert. There are no full-table scans on the hot path.

## Architecture

```
CDN (static assets, fonts) → load balancer → N stateless Next.js instances (Node 20+)
                                              │
                                   PgBouncer (transaction pooling)
                                              │
                            PostgreSQL primary (+ read replica for reports)
                                              │
                         Object storage (PDF/video) via signed, short-lived URLs
```

- **App tier:** stateless, so scale horizontally. Sessions live in Postgres, not memory. Start with enough instances to keep CPU under ~50% at test peak, then size from measurements.
- **Database:** managed PostgreSQL with point-in-time recovery, behind PgBouncer. `DB_POOL_MAX` per instance × instances must stay under the pooler's limit.
- **Hot-path design already in code:** a read-only access check; one-query autosave with server-side expiry; the client batches and retries saves; one running attempt per user per course; submit is idempotent; expiry is enforced by the server clock, not the browser.
- **Recommended before a 25k event:**
  - Move `rate_limits` and session lookups to Redis (or add a short in-process session cache).
  - Serve PDFs and videos from object storage + CDN with signed URLs instead of streaming through Node (swap `lib/storage.ts` / `lib/serve.ts`).
  - Put reports on a read replica.
  - Add a staggered start (a lobby that releases cohorts over 60–120 s) if the start burst exceeds the measured capacity.
  - Partition or archive `rating_events` by month as it grows.

## Pass criteria for the load test

- Error rate < 0.5% across the whole run.
- Autosave p95 < 300 ms, p99 < 800 ms; start p95 < 1.5 s; submit p95 < 1 s.
- Zero lost saves (compare client-sent ratings with `exam_attempt_items`).
- Database CPU < 70%, no connection exhaustion at the pooler.

Run the test on a staging copy with synthetic accounts. Never run it against production.

## External costs (line items to quote)

These are the items to get quotes for. The amounts depend on provider, region and measured load, so none are estimated here:

- App hosting: N instances, plus a load balancer and CDN egress.
- Managed PostgreSQL (primary + replica, PITR storage) and PgBouncer.
- Object storage + CDN egress for PDFs and video (video is usually the largest bandwidth item).
- Email delivery (transactional SMTP or an API provider: per-message pricing and sending limits).
- Payment gateway fees (per transaction; see `PAYMENTS.md`).
- Monitoring / logging / uptime alerts.
- The load-testing environment itself (temporary, but full size).

Also check each provider's usage limits: email sending caps, Stripe API rate limits (webhooks are queued by Stripe and retried), database connection limits and CDN request limits.
