import Link from 'next/link';
import { pageUser } from '@/lib/auth';
import { pageCourseAccess } from '@/lib/access';
import { getT, pick } from '@/lib/i18n';
import { LearnNav } from '@/components/LearnNav';

export default async function LearnLayout({ children, params }: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await pageUser(`/learn/${slug}`);
  const course = await pageCourseAccess(user, slug);
  const { t, lang } = await getT();
  return (
    <>
      <div className="page-head" style={{ paddingBlock: '24px 26px' }}>
        <div className="container">
          <div className="crumbs"><Link href="/dashboard">{t.nav.dashboard}</Link></div>
          <h1 style={{ fontSize: 'clamp(1.35rem, 3vw, 2rem)' }}>{pick(lang, course.title_en, course.title_ar)}</h1>
        </div>
      </div>
      <div className="container learn-shell">
        <LearnNav slug={slug} />
        <div style={{ minWidth: 0 }}>{children}</div>
      </div>
    </>
  );
}
