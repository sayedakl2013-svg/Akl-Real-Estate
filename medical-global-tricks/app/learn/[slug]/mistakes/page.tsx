import Link from 'next/link';
import { domainsFor, learnCtx } from '@/lib/access';
import { getT } from '@/lib/i18n';
import { searchQuestions } from '@/lib/study';
import { QuestionLibrary } from '@/components/QuestionLibrary';

export const dynamic = 'force-dynamic';

export default async function Mistakes({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { user, course } = await learnCtx(slug);
  const [{ t }, domains, review] = await Promise.all([getT(), domainsFor(course.id), searchQuestions(user.id, course.id, { filter: 'review', limit: 1 })]);
  return (
    <div className="stack">
      <div className="spread">
        <h2 style={{ margin: 0 }}>{t.learn.mistakes}</h2>
        {review.total > 0 && <Link className="btn btn-warn" href={`/learn/${slug}/practice?filter=review`}>{t.learn.retrain} ({review.total})</Link>}
      </div>
      {review.total === 0 ? <div className="alert alert-info">{t.learn.nothingToReview}</div> : (
        <QuestionLibrary courseId={course.id} domains={domains} initialFilter="review" />
      )}
    </div>
  );
}
