'use client';
import { createContext, useContext } from 'react';
import { dict, type Dict, type Lang } from '@/lib/dict';

const Ctx = createContext<{ lang: Lang; t: Dict }>({ lang: 'en', t: dict.en });

export function I18nProvider({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  return <Ctx.Provider value={{ lang, t: dict[lang] }}>{children}</Ctx.Provider>;
}

export const useI18n = () => useContext(Ctx);
