'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useI18n } from './I18n';
import { Icon } from './Icons';
import { onSoundChange, play, setSoundEnabled, soundEnabled } from '@/lib/sound';
import { api } from './api';

export function SoundToggle() {
  const { t } = useI18n();
  const [on, setOn] = useState(false);
  useEffect(() => {
    setOn(soundEnabled());
    return onSoundChange(setOn);
  }, []);
  return (
    <button type="button" className="icon-btn" aria-pressed={on} title={t.sound.label}
      aria-label={`${t.sound.label}: ${on ? t.sound.on : t.sound.off}`} onClick={() => setSoundEnabled(!on)}>
      <Icon name={on ? 'volume' : 'mute'} />
      <span className="hide-sm">{on ? t.sound.on : t.sound.off}</span>
    </button>
  );
}

export function LangToggle() {
  const { t, lang } = useI18n();
  const router = useRouter();
  return (
    <button type="button" className="icon-btn" aria-label={t.lang.label} lang={lang === 'ar' ? 'en' : 'ar'}
      onClick={async () => {
        play('tap');
        await api('/api/lang', { lang: lang === 'ar' ? 'en' : 'ar' }).catch(() => {});
        router.refresh();
      }}>
      <Icon name="globe" />
      <span className="hide-sm">{t.lang.switch}</span>
      <span className="show-sm" aria-hidden="true">{lang === 'ar' ? 'EN' : 'ع'}</span>
    </button>
  );
}

export function LogoutButton({ className }: { className?: string }) {
  const { t } = useI18n();
  const router = useRouter();
  return (
    <button type="button" className={className} onClick={async () => {
      await api('/api/auth/logout', {}).catch(() => {});
      router.push('/');
      router.refresh();
    }}>
      {t.nav.logout}
    </button>
  );
}

export function MobileMenu({ links, signedIn }: { links: { href: string; label: string }[]; signedIn: boolean }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="icon-btn menu-toggle" aria-expanded={open} aria-controls="mobile-nav"
        aria-label={open ? t.nav.close : t.nav.menu} onClick={() => setOpen(!open)}>
        <Icon name={open ? 'x' : 'menu'} />
      </button>
      {open && (
        <div className="mobile-nav-portal" style={{ position: 'absolute', insetInline: 0, top: '100%', background: 'var(--navy-950)' }}>
          <nav id="mobile-nav" className="mobile-nav container" aria-label={t.nav.menu} onClick={() => setOpen(false)}>
            {links.map((l) => <Link key={l.href} href={l.href}>{l.label}</Link>)}
            {signedIn && <LogoutButton />}
          </nav>
        </div>
      )}
    </>
  );
}
