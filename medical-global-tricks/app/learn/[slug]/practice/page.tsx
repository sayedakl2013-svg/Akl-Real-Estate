import { domainsFor, learnCtx } from '@/lib/access';
import { PracticeSession } from '@/components/PracticeSession';

export const dynamic = 'force-dynamic';

export default async function Practice({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ domain?: string; filter?: string }> }) {
  const { slug } = await params;
  const sp = await searchParams;
  const { course } = await learnCtx(slug);
  const domains = await domainsFor(course.id);
  const filter = ['review', 'saved', 'unrated'].includes(sp.filter ?? '') ? sp.filter! : '';
  const domain = domains.some((d) => String(d.id) === sp.domain) ? sp.domain! : '';
  return <PracticeSession courseId={course.id} slug={slug} domains={domains} initialDomain={domain} initialFilter={filter} autostart={!!(sp.domain || sp.filter)} />;
}
