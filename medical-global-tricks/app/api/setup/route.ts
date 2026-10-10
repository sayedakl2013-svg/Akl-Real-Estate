import { timingSafeEqual } from 'node:crypto';
import { handler, json, readJson, clientIp, HttpError } from '@/lib/http';
import { requireUser } from '@/lib/auth';
import { tx } from '@/lib/db';
import { rateLimit } from '@/lib/ratelimit';
import { audit } from '@/lib/audit';

// One-time bootstrap of the first admin on a fresh deployment (no shell needed).
// Works only while no admin exists and only with the ADMIN_BOOTSTRAP_TOKEN set on the server.
export const POST = handler(async (req) => {
  const expected = process.env.ADMIN_BOOTSTRAP_TOKEN ?? '';
  if (expected.length < 16) throw new HttpError(404, 'not_found');
  const user = await requireUser();
  await rateLimit(`setup:${clientIp(req)}`, 5, 3600);
  const { token } = await readJson(req);
  const a = Buffer.from(String(token ?? '')), b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) throw new HttpError(403, 'invalid_token');
  await tx(async (c) => {
    await c.query('LOCK TABLE users IN SHARE ROW EXCLUSIVE MODE');
    const { rows } = await c.query(`SELECT 1 FROM users WHERE role = 'admin' LIMIT 1`);
    if (rows.length) throw new HttpError(409, 'admin_exists');
    await c.query(`UPDATE users SET role = 'admin', email_verified_at = COALESCE(email_verified_at, now()) WHERE id = $1`, [user.id]);
  });
  await audit(user.id, 'admin.bootstrap', 'user', user.id, null, clientIp(req));
  return json({ ok: true });
});
