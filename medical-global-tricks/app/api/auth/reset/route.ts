import { handler, json, readJson, str, HttpError } from '@/lib/http';
import { tx } from '@/lib/db';
import { hashPassword, sha256 } from '@/lib/crypto';
import { validatePassword } from '@/lib/auth';
import { audit } from '@/lib/audit';

export const POST = handler(async (req) => {
  const body = await readJson(req);
  const password = typeof body.password === 'string' ? body.password : '';
  const err = validatePassword(password);
  if (err) throw new HttpError(400, err);
  const hash = await hashPassword(password);
  const userId = await tx(async (c) => {
    const t = await c.query(
      `UPDATE email_tokens SET used_at = now()
        WHERE token_hash = $1 AND kind = 'reset' AND used_at IS NULL AND expires_at > now() RETURNING user_id`,
      [sha256(str(body.token, 200))]);
    if (!t.rows[0]) throw new HttpError(400, 'invalid_token');
    const id = t.rows[0].user_id;
    // A reset link proves control of the inbox, so the email counts as verified.
    await c.query('UPDATE users SET password_hash = $2, email_verified_at = COALESCE(email_verified_at, now()), updated_at = now() WHERE id = $1', [id, hash]);
    await c.query('UPDATE sessions SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL', [id]);
    return id;
  });
  await audit(userId, 'password_reset', 'user', userId);
  return json({ ok: true });
});
