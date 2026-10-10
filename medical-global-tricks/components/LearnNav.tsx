'use client';
import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useI18n } from './I18n';
import { Icon } from './Icons';

export function LearnNav({ slug }: { slug: string }) {
  const { t } = useI18n();
  const path = usePathname();
  const base = `/learn/${slug}`;
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    // On phones the nav is a horizontal strip: keep the current section visible.
    ref.current?.querySelector('[aria-current=page]')?.scrollIntoView({ block: 'nearest', inline: 'center' });
  }, [path]);
  const items: [string, string, string][] = [
    ['', t.learn.dashboard, 'grid'],
    ['/library', t.learn.library, 'book'],
    ['/practice', t.learn.practice, 'mic'],
    ['/exams', t.learn.exams, 'timer'],
    ['/mistakes', t.learn.mistakes, 'alert'],
    ['/history', t.learn.history, 'chart'],
    ['/plan', t.learn.plan, 'check'],
    ['/summaries', t.learn.summaries, 'file'],
    ['/videos', t.learn.videos, 'video'],
  ];
  return (
    <nav ref={ref} className="side-nav no-print" aria-label={t.learn.dashboard}>
      {items.map(([href, label, icon]) => {
        const full = base + href;
        const current = href === '' ? path === base : path.startsWith(full);
        return (
          <Link key={href} href={full} aria-current={current ? 'page' : undefined}>
            <Icon name={icon} /> {label}
          </Link>
        );
      })}
    </nav>
  );
}
