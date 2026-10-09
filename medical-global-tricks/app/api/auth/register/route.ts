import { handler, json, readJson, str, clientIp, HttpError } from '@/lib/http';
import { one } from '@/lib/db';
import { hashPassword } from '@/lib/crypto';
import { claimDevice, createSession, getOrCreateDeviceKey, validEmail, validatePassword } from '@/lib/auth';
import { rateLimit } from '@/lib/ratelimit';
import { sendVerificationEmail } from '@/lib/email';
import { audit } from '@/lib/audit';

export const POST = handler(async (req) => {
  const body = await readJson(req);
  const name = str(body.name, 120);
  const email = str(body.email, 254).toLowerCase();
  const password = typeof body.password === 'string' ? body.password : '';
  const locale = body.lang === 'ar' ? 'ar' : 'en';
  const ip = clientIp(req);
  await rateLimit(`register:${ip}`, 10, 3600);
  if (!name) throw new HttpError(400, 'name_required');
  if (!validEmail(email)) throw new HttpError(400, 'invalid_email');
  const pwErr = validatePassword(password);
  if (pwErr) throw new HttpError(400, pwErr);

  const user = await one<{ id: string }>(
    `INSERT INTO users(email, name, password_hash, locale) VALUES ($1,$2,$3,$4)
     ON CONFLICT (email) DO NOTHING RETURNING id`,
    [email, name, await hashPassword(password), locale],
  );
  if (!user) throw new HttpError(409, 'email_taken');

  const ua = req.headers.get('user-agent') ?? '';
  const device = await claimDevice(user.id, 'student', await getOrCreateDeviceKey(), ua);
  await createSession(user.id, device.ok ? device.deviceId : null, ip, ua);
  const mail = await sendVerificationEmail(user.id, email, name);
  await audit(user.id, 'register', 'user', user.id, null, ip);
  return json({ ok: true, emailSent: mail.sent });
});
