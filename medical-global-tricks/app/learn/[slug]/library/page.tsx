import { domainsFor, learnCtx } from '@/lib/access';
import { getT } from '@/lib/i18n';
import { QuestionLibrary } from '@/components/QuestionLibrary';

export const dynamic = 'force-dynamic';

export default async function Library({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ filter?: string }> }) {
  const { slug } = await params;
  const { filter } = await searchParams;
  const { course } = await learnCtx(slug);
  const [{ t }, domains] = await Promise.all([getT(), domainsFor(course.id)]);
  return (
    <div className="stack">
      <h2>{t.learn.library}</h2>
      <QuestionLibrary courseId={course.id} domains={domains} initialFilter={['saved', 'review', 'unrated'].includes(filter ?? '') ? filter : ''} />
    </div>
  );
}
