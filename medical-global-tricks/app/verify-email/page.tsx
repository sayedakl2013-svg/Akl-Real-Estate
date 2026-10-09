import { getT } from '@/lib/i18n';
import { AuthShell } from '@/components/AuthShell';
import { VerifyRunner } from '@/components/AuthForms';

export const metadata = { title: 'Confirm email' };

export default async function Verify({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const { t } = await getT();
  return <AuthShell title={t.auth.verifyTitle}>{token ? <VerifyRunner token={token} /> : <div className="alert alert-error">{t.auth.verifyFailed}</div>}</AuthShell>;
}
