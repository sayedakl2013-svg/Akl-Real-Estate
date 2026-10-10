import { redirect } from 'next/navigation';
import { getT } from '@/lib/i18n';
import { getUser } from '@/lib/auth';
import { emailConfigured } from '@/lib/email';
import { AuthShell } from '@/components/AuthShell';
import { RegisterForm } from '@/components/AuthForms';

export const metadata = { title: 'Create account' };

export default async function Register() {
  if (await getUser()) redirect('/dashboard');
  const { t } = await getT();
  return (
    <AuthShell title={t.auth.signUp}>
      {!emailConfigured() && <div className="alert alert-info">{t.auth.emailOff}</div>}
      <RegisterForm />
    </AuthShell>
  );
}
