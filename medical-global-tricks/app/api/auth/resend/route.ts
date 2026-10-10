import { handler, json } from '@/lib/http';
import { requireUser } from '@/lib/auth';
import { rateLimit } from '@/lib/ratelimit';
import { sendVerificationEmail } from '@/lib/email';

export const POST = handler(async () => {
  const u = await requireUser();
  if (u.emailVerified) return json({ ok: true, alreadyVerified: true });
  await rateLimit(`resend:${u.id}`, 3, 3600);
  const r = await sendVerificationEmail(u.id, u.email, u.name);
  return json({ ok: true, emailSent: r.sent });
});
