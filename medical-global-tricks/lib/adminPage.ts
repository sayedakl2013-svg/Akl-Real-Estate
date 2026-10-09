import 'server-only';
import { getUser } from './auth';
import { getT } from './i18n';
import { redirect } from 'next/navigation';

/** Shared helper for admin pages: bilingual label function + role gate (layout already checks staff). */
export async function adminCtx(minRole: 'editor' | 'admin' = 'editor') {
  const user = await getUser();
  if (!user || (minRole === 'admin' && user.role !== 'admin') || user.role === 'student') redirect('/admin');
  const { lang } = await getT();
  const L = (en: string, ar: string) => (lang === 'ar' ? ar : en);
  const df = new Intl.DateTimeFormat(lang === 'ar' ? 'ar-AE' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' });
  return { user, lang, L, fmt: (d: string | Date | null) => (d ? df.format(new Date(d)) : '—') };
}
