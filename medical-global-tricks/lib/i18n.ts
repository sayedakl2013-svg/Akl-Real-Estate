import 'server-only';
import { cookies, headers } from 'next/headers';
import { dict, type Lang } from './dict';

export const LANG_COOKIE = 'mgt_lang';

export async function getLang(): Promise<Lang> {
  const c = (await cookies()).get(LANG_COOKIE)?.value;
  if (c === 'ar' || c === 'en') return c;
  const al = (await headers()).get('accept-language') ?? '';
  return /^ar\b/i.test(al) ? 'ar' : 'en';
}

export async function getT() {
  const lang = await getLang();
  return { lang, t: dict[lang], dir: lang === 'ar' ? 'rtl' : 'ltr' } as const;
}

export const pick = (lang: Lang, en: string, ar: string) => (lang === 'ar' && ar ? ar : en);
