import { handler, json, readJson, str, HttpError } from '@/lib/http';
import { one, q } from '@/lib/db';
import { sha256 } from '@/lib/crypto';

export const POST = handler(async (req) => {
  const { token } = await readJson(req);
  const row = await one<{ id: string; user_id: string }>(
    `UPDATE email_tokens SET used_at = now()
      WHERE token_hash = $1 AND kind = 'verify' AND used_at IS NULL AND expires_at > now()
      RETURNING id, user_id`, [sha256(str(token, 200))]);
  if (!row) throw new HttpError(400, 'invalid_token');
  await q('UPDATE users SET email_verified_at = COALESCE(email_verified_at, now()), updated_at = now() WHERE id = $1', [row.user_id]);
  return json({ ok: true });
});
