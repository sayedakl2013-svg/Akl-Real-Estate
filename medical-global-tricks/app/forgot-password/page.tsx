import { getT } from '@/lib/i18n';
import { emailConfigured } from '@/lib/email';
import { AuthShell } from '@/components/AuthShell';
import { ForgotForm } from '@/components/AuthForms';

export const metadata = { title: 'Reset password' };

export default async function Forgot() {
  const { t } = await getT();
  return (
    <AuthShell title={t.auth.forgot}>
      {!emailConfigured() && <div className="alert alert-info">{t.auth.emailOff}</div>}
      <ForgotForm />
    </AuthShell>
  );
}
