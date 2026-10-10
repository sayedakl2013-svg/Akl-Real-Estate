import Link from 'next/link';
import { getT } from '@/lib/i18n';

export default async function NotFound() {
  const { t } = await getT();
  return (
    <div className="container section" style={{ textAlign: 'center' }}>
      <h1>404</h1>
      <p className="muted">{t.common.error}</p>
      <Link className="btn btn-primary" href="/">{t.nav.home}</Link>
    </div>
  );
}
