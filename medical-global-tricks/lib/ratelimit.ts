import 'server-only';
import { one } from './db';
import { HttpError } from './http';

/** Fixed-window limiter stored in Postgres (swap for Redis at high scale). */
export async function rateLimit(key: string, limit: number, windowSeconds: number) {
  const row = await one<{ count: number }>(
    `INSERT INTO rate_limits(key, window_start, count) VALUES ($1, now(), 1)
     ON CONFLICT (key) DO UPDATE SET
       count = CASE WHEN rate_limits.window_start < now() - make_interval(secs => $2) THEN 1 ELSE rate_limits.count + 1 END,
       window_start = CASE WHEN rate_limits.window_start < now() - make_interval(secs => $2) THEN now() ELSE rate_limits.window_start END
     RETURNING count`,
    [key, windowSeconds],
  );
  if (row && row.count > limit) throw new HttpError(429, 'rate_limited');
}
