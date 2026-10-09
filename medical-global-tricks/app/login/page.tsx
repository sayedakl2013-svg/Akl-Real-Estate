import { redirect } from 'next/navigation';
import { getT } from '@/lib/i18n';
import { getUser } from '@/lib/auth';
import { AuthShell } from '@/components/AuthShell';
import { LoginForm } from '@/components/AuthForms';

export const metadata = { title: 'Sign in' };

export default async function Login({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  if (await getUser()) redirect(next?.startsWith('/') && !next.startsWith('//') ? next : '/dashboard');
  const { t } = await getT();
  return <AuthShell title={t.auth.signIn}><LoginForm next={next ?? null} /></AuthShell>;
}
