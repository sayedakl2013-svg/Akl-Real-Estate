import { handler, json, readJson, str, clientIp, HttpError } from '@/lib/http';
import { one } from '@/lib/db';
import { DUMMY_HASH, sha256, verifyPassword } from '@/lib/crypto';
import { deviceLabel, getOrCreateDeviceKey } from '@/lib/auth';
import { rateLimit } from '@/lib/ratelimit';
import { audit } from '@/lib/audit';

// Called from the sign-in screen of the *new* device after a device_limit response.
// Re-checks the password so only the account owner can file a request.
export const POST = handler(async (req) => {
  const body = await readJson(req);
  const email = str(body.email, 254).toLowerCase();
  const password = typeof body.password === 'string' ? body.password.slice(0, 200) : '';
  const ip = clientIp(req);
  await rateLimit(`devreq:${ip}`, 10, 3600);
  const user = await one<{ id: string; password_hash: string }>('SELECT id, password_hash FROM users WHERE email = $1 AND disabled_at IS NULL', [email]);
  const ok = await verifyPassword(password, user?.password_hash ?? DUMMY_HASH);
  if (!user || !ok) throw new HttpError(401, 'invalid_credentials');

  const replaceId = str(body.replaceDeviceId, 64);
  const dev = await one('SELECT id FROM devices WHERE id = $1 AND user_id = $2 AND revoked_at IS NULL', [replaceId, user.id]);
  if (!dev) throw new HttpError(400, 'unknown');
  const key = await getOrCreateDeviceKey();
  const row = await one(
    `INSERT INTO device_replacement_requests(user_id, new_device_key_hash, new_device_label, replace_device_id, reason)
     VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING RETURNING id`,
    [user.id, sha256(key), deviceLabel(req.headers.get('user-agent') ?? ''), dev.id, str(body.reason, 500)],
  );
  if (!row) throw new HttpError(409, 'request_pending');
  await audit(user.id, 'device_request', 'device_replacement_request', row.id, null, ip);
  return json({ ok: true });
});
