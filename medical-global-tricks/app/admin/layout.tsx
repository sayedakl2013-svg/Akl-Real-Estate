import { pageStaff } from '@/lib/auth';
import { getT } from '@/lib/i18n';
import { AdminNav } from '@/components/AdminNav';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Admin' };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await pageStaff('/admin');
  const { lang } = await getT();
  return (
    <>
      <div className="page-head" style={{ paddingBlock: '22px 24px' }}>
        <div className="container"><h1 style={{ fontSize: '1.7rem' }}>{lang === 'ar' ? 'لوحة الإدارة' : 'Admin panel'}</h1><p>{user.name} · {user.role}</p></div>
      </div>
      <div className="container learn-shell">
        <AdminNav isAdmin={user.role === 'admin'} />
        <div style={{ minWidth: 0 }} className="stack">{children}</div>
      </div>
    </>
  );
}
