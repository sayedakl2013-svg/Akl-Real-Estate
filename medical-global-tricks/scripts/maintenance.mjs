// Periodic housekeeping (run every 5–15 minutes from cron / a scheduler). Safe to run concurrently.
import './env.mjs';
import pg from 'pg';

const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
await db.connect();
const r1 = await db.query(`UPDATE enrollments SET status = 'expired', updated_at = now()
  WHERE status IN ('active','canceled') AND expires_at IS NOT NULL AND expires_at <= now()`);
const r2 = await db.query(`WITH x AS (
    UPDATE exam_attempts SET status = 'expired', submitted_at = expires_at
     WHERE status = 'in_progress' AND expires_at < now() - interval '1 minute' RETURNING id)
  UPDATE exam_attempts a SET recalled = s.recalled, review = s.review, unrated = s.unrated
    FROM (SELECT i.attempt_id, count(*) FILTER (WHERE rating = 'recalled')::int AS recalled,
                 count(*) FILTER (WHERE rating = 'review')::int AS review, count(*) FILTER (WHERE rating IS NULL)::int AS unrated
            FROM exam_attempt_items i JOIN x ON x.id = i.attempt_id GROUP BY i.attempt_id) s
   WHERE a.id = s.attempt_id`);
const r3 = await db.query(`DELETE FROM sessions WHERE expires_at < now() - interval '7 days' OR revoked_at < now() - interval '7 days'`);
const r4 = await db.query(`DELETE FROM rate_limits WHERE window_start < now() - interval '1 day'`);
const r5 = await db.query(`DELETE FROM email_tokens WHERE expires_at < now() - interval '7 days'`);
console.log(`expired enrollments ${r1.rowCount}, expired attempts ${r2.rowCount}, sessions purged ${r3.rowCount}, rate rows ${r4.rowCount}, tokens ${r5.rowCount}`);
await db.end();
