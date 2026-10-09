import { handler, json, readJson, str, clientIp } from '@/lib/http';
import { one } from '@/lib/db';
import { rateLimit } from '@/lib/ratelimit';
import { sendResetEmail } from '@/lib/email';

// Always answers the same way so the endpoint cannot be used to discover accounts.
export const POST = handler(async (req) => {
  const { email } = await readJson(req);
  const e = str(email, 254).toLowerCase();
  await rateLimit(`forgot:${clientIp(req)}`, 5, 900);
  await rateLimit(`forgot:${e}`, 3, 3600);
  const user = await one('SELECT id, name FROM users WHERE email = $1 AND disabled_at IS NULL', [e]);
  if (user) await sendResetEmail(user.id, e, user.name);
  return json({ ok: true });
});
