import Link from 'next/link';
import { getUser } from '@/lib/auth';
import { getT } from '@/lib/i18n';
import { LogoMark } from './Logo';
import { LangToggle, LogoutButton, MobileMenu, SoundToggle } from './HeaderTools';
import { Icon } from './Icons';

export async function Header() {
  const [user, { t }] = await Promise.all([getUser(), getT()]);
  const links = [
    { href: '/', label: t.nav.home },
    { href: '/courses', label: t.nav.courses },
    ...(user ? [{ href: '/dashboard', label: t.nav.dashboard }, { href: '/account', label: t.nav.account }] : []),
    ...(user && user.role !== 'student' ? [{ href: '/admin', label: t.nav.admin }] : []),
    ...(!user ? [{ href: '/login', label: t.nav.login }, { href: '/register', label: t.nav.register }] : []),
  ];
  return (
    <header className="site-header">
      <div className="container bar">
        <Link href="/" className="brand" aria-label={t.brand}>
          <LogoMark />
          <span className="brand-name">Medical Global Tricks<small>Exam preparation</small></span>
        </Link>
        <nav className="main-nav" aria-label="Main">
          {links.filter((l) => !['/login', '/register', '/account'].includes(l.href)).map((l) => (
            <Link key={l.href} href={l.href}>{l.label}</Link>
          ))}
        </nav>
        <div className="header-tools">
          {user && (
            <Link href="/account" className="user-chip" title={user.email}>
              <span className="avatar" aria-hidden="true">{user.name.trim().charAt(0).toUpperCase()}</span>
              <span>{user.name}</span>
            </Link>
          )}
          <LangToggle />
          <SoundToggle />
          {user ? (
            <span className="hide-sm"><LogoutButton className="icon-btn" /></span>
          ) : (
            <Link href="/login" className="icon-btn hide-sm"><Icon name="user" />{t.nav.login}</Link>
          )}
          <MobileMenu links={links} signedIn={!!user} />
        </div>
      </div>
    </header>
  );
}
