import { pageUser } from '@/lib/auth';
import { getT } from '@/lib/i18n';
import { one } from '@/lib/db';
import { AuthShell } from '@/components/AuthShell';
import { SetupForm } from '@/components/SetupForm';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Setup' };

export default async function Setup() {
  const user = await pageUser('/setup');
  const { lang } = await getT();
  const L = (en: string, ar: string) => (lang === 'ar' ? ar : en);
  const hasAdmin = await one(`SELECT 1 FROM users WHERE role = 'admin' LIMIT 1`);
  const enabled = (process.env.ADMIN_BOOTSTRAP_TOKEN ?? '').length >= 16;
  return (
    <AuthShell title={L('First admin setup', 'إعداد أول مشرف')}>
      {hasAdmin || !enabled ? (
        <div className="alert alert-info">{L('Setup is closed: an admin already exists or no bootstrap token is configured.', 'الإعداد مغلق: يوجد مشرف بالفعل أو لم يُضبط رمز الإعداد.')}</div>
      ) : (
        <>
          <p className="muted">{L(`Signed in as ${user.email}. Paste the ADMIN_BOOTSTRAP_TOKEN value from your hosting dashboard. This works once, while no admin exists.`, `مسجّل الدخول باسم ${user.email}. الصق قيمة ADMIN_BOOTSTRAP_TOKEN من لوحة الاستضافة. يعمل مرة واحدة فقط طالما لا يوجد مشرف.`)}</p>
          <SetupForm lang={lang} />
        </>
      )}
    </AuthShell>
  );
}
