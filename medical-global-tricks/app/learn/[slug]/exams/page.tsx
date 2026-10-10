import Link from 'next/link';
import { domainsFor, learnCtx } from '@/lib/access';
import { getT } from '@/lib/i18n';
import { attemptsFor } from '@/lib/study';
import { one } from '@/lib/db';
import { ExamSetup } from '@/components/ExamSetup';

export const dynamic = 'force-dynamic';

export default async function Exams({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { user, course } = await learnCtx(slug);
  const [{ t, lang }, domains, attempts, review] = await Promise.all([
    getT(), domainsFor(course.id), attemptsFor(user.id, course.id, 20),
    one<{ n: number }>(`SELECT count(*)::int AS n FROM question_progress qp JOIN questions qq ON qq.id = qp.question_id
      WHERE qp.user_id = $1 AND qp.course_id = $2 AND qp.last_rating = 'review' AND qq.status = 'published'`, [user.id, course.id]),
  ]);
  const open = attempts.find((a) => a.status === 'in_progress');
  const df = new Intl.DateTimeFormat(lang === 'ar' ? 'ar-AE' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' });
  const statusLabel = (s: string) => (s === 'in_progress' ? t.exam.in_progress : s === 'expired' ? t.exam.expiredStatus : t.exam.submittedStatus);
  return (
    <div className="stack">
      <h2>{t.learn.exams}</h2>
      {open ? (
        <div className="alert alert-info spread">
          <b>{t.learn.openAttempt}</b>
          <Link className="btn btn-dark btn-sm" href={`/learn/${slug}/exams/${open.id}`}>{t.learn.resume}</Link>
        </div>
      ) : (
        <ExamSetup courseId={course.id} slug={slug} domains={domains} reviewCount={review?.n ?? 0} />
      )}
      <h3>{t.learn.attempts}</h3>
      {attempts.length === 0 ? <p className="muted">{t.exam.none}</p> : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>{t.exam.started}</th><th>{t.exam.mode}</th><th>{t.exam.count}</th><th>{t.exam.status}</th><th>✓ / ↻ / –</th><th /></tr></thead>
            <tbody>
              {attempts.map((a) => (
                <tr key={a.id}>
                  <td>{df.format(new Date(a.started_at))}</td>
                  <td>{a.mode === 'mixed' ? t.exam.mixed : a.mode === 'domain' ? t.exam.oneDomain : t.exam.fromReview}</td>
                  <td>{a.question_count}</td>
                  <td>{statusLabel(a.status)}</td>
                  <td className="ltr">{a.status === 'in_progress' ? '—' : `${a.recalled} / ${a.review} / ${a.unrated}`}</td>
                  <td><Link href={`/learn/${slug}/exams/${a.id}${a.status === 'in_progress' ? '' : '/result'}`}>{a.status === 'in_progress' ? t.learn.resume : t.exam.view}</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
