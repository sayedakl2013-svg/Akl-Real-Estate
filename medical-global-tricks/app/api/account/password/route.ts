import { handler, json, readJson, HttpError } from '@/lib/http';
import { one, q } from '@/lib/db';
import { hashPassword, verifyPassword } from '@/lib/crypto';
import { requireUser, validatePassword } from '@/lib/auth';
import { rateLimit } from '@/lib/ratelimit';
import { audit } from '@/lib/audit';

export const POST = handler(async (req) => {
  const u = await requireUser();
  const body = await readJson(req);
  await rateLimit(`pwchange:${u.id}`, 10, 3600);
  const row = await one('SELECT password_hash FROM users WHERE id = $1', [u.id]);
  if (!row || !(await verifyPassword(String(body.current ?? ''), row.password_hash))) throw new HttpError(401, 'invalid_credentials');
  const err = validatePassword(String(body.password ?? ''));
  if (err) throw new HttpError(400, err);
  await q('UPDATE users SET password_hash = $2, updated_at = now() WHERE id = $1', [u.id, await hashPassword(String(body.password))]);
  // Sign out every other session; keep this one.
  await q('UPDATE sessions SET revoked_at = now() WHERE user_id = $1 AND id <> $2 AND revoked_at IS NULL', [u.id, u.sessionId]);
  await audit(u.id, 'password_change', 'user', u.id);
  return json({ ok: true });
});
