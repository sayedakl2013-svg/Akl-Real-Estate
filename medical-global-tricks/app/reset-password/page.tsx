import { getT } from '@/lib/i18n';
import { AuthShell } from '@/components/AuthShell';
import { ResetForm } from '@/components/AuthForms';

export const metadata = { title: 'Set new password' };

export default async function Reset({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const { t } = await getT();
  return <AuthShell title={t.auth.setPassword}>{token ? <ResetForm token={token} /> : <div className="alert alert-error">{t.auth.errors.invalid_token}</div>}</AuthShell>;
}
