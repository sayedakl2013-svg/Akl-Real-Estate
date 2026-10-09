import { handler, json, readJson, str, clientIp, HttpError } from '@/lib/http';
import { one } from '@/lib/db';
import { DUMMY_HASH, verifyPassword } from '@/lib/crypto';
import { claimDevice, createSession, getOrCreateDeviceKey, type Role } from '@/lib/auth';
import { rateLimit } from '@/lib/ratelimit';
import { audit } from '@/lib/audit';

export const POST = handler(async (req) => {
  const body = await readJson(req);
  const email = str(body.email, 254).toLowerCase();
  const password = typeof body.password === 'string' ? body.password.slice(0, 200) : '';
  const ip = clientIp(req);
  await rateLimit(`login:ip:${ip}`, 30, 900);
  await rateLimit(`login:email:${email}`, 10, 900);

  const user = await one<{ id: string; password_hash: string; role: Role; disabled_at: string | null }>(
    'SELECT id, password_hash, role, disabled_at FROM users WHERE email = $1', [email]);
  const ok = await verifyPassword(password, user?.password_hash ?? DUMMY_HASH);
  if (!user || !ok || user.disabled_at) throw new HttpError(401, 'invalid_credentials');

  const ua = req.headers.get('user-agent') ?? '';
  const device = await claimDevice(user.id, user.role, await getOrCreateDeviceKey(), ua);
  if (!device.ok) {
    await audit(user.id, 'login_blocked_device_limit', 'user', user.id, null, ip);
    return json({ error: 'device_limit', devices: device.devices }, 409);
  }
  await createSession(user.id, device.deviceId, ip, ua);
  await audit(user.id, 'login', 'user', user.id, null, ip);
  return json({ ok: true });
});
