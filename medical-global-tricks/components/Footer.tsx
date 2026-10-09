import Link from 'next/link';
import { getT } from '@/lib/i18n';
import { LogoMark } from './Logo';

export async function Footer() {
  const { t } = await getT();
  const year = new Date().getFullYear();
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="cols">
          <div className="stack">
            <div className="row" style={{ color: '#fff', fontWeight: 800 }}>
              <LogoMark /> <span className="ltr">Medical Global Tricks</span>
            </div>
            <p style={{ margin: 0 }}>{t.tagline}</p>
            <p style={{ margin: 0 }}>{t.footer.independent}</p>
          </div>
          <div className="stack">
            <ul className="links">
              <li><Link href="/legal/privacy">{t.footer.privacy}</Link></li>
              <li><Link href="/legal/terms">{t.footer.terms}</Link></li>
              <li><Link href="/legal/refund">{t.footer.refund}</Link></li>
              <li><Link href="/legal/disclaimer">{t.footer.disclaimer}</Link></li>
            </ul>
            <p style={{ margin: 0, fontSize: '0.85rem' }}>{t.footer.ownership}</p>
          </div>
        </div>
        <div className="legal-line">
          <span>© {year} <span className="ltr">Medical Global Tricks</span>. {t.footer.rights}</span>
        </div>
      </div>
    </footer>
  );
}
