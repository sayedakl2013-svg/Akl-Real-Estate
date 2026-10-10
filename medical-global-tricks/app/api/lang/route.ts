import { cookies } from 'next/headers';
import { handler, json, readJson } from '@/lib/http';
import { getUser } from '@/lib/auth';
import { q } from '@/lib/db';
import { LANG_COOKIE } from '@/lib/i18n';

export const POST = handler(async (req) => {
  const { lang } = await readJson(req);
  const l = lang === 'ar' ? 'ar' : 'en';
  (await cookies()).set(LANG_COOKIE, l, { path: '/', sameSite: 'lax', maxAge: 60 * 60 * 24 * 365 });
  const u = await getUser();
  if (u) await q('UPDATE users SET locale = $2 WHERE id = $1', [u.id, l]);
  return json({ ok: true });
});
