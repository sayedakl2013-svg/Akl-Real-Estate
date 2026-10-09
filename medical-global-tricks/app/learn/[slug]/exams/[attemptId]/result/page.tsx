import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { domainsFor, learnCtx } from '@/lib/access';
import { getT, pick } from '@/lib/i18n';
import { getAttempt } from '@/lib/study';

export const dynamic = 'force-dynamic';

export default async function Result({ params, searchParams }: { params: Promise<{ slug: string; attemptId: string }>; searchParams: Promise<{ expired?: string }> }) {
  const { slug, attemptId } = await params;
  const sp = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(attemptId)) notFound();
  const { user, course } = await learnCtx(slug);
  const data = await getAttempt(user.id, attemptId);
  if (!data || data.attempt.course_id !== course.id) notFound();
  if (data.attempt.status === 'in_progress') redirect(`/learn/${slug}/exams/${attemptId}`);
  const [{ t, lang }, domains] = await Promise.all([getT(), domainsFor(course.id)]);
  const { attempt, items } = data;
  const per = domains.map((d) => {
    const its = items.filter((i) => i.domain_id === d.id);
    return { d, n: its.length, r: its.filter((i) => i.rating === 'recalled').length, v: its.filter((i) => i.rating === 'review').length };
  }).filter((x) => x.n > 0);
  const toReview = items.filter((i) => i.rating === 'review' || i.flagged || !i.rating);
  return (
    <div className="stack">
      <h2>{t.exam.result}</h2>
      {(sp.expired || attempt.status === 'expired') && <div className="alert alert-warn">{t.exam.expired}</div>}
      <div className="grid grid-4">
        <div className="card stat"><b>{attempt.question_count}</b><span>{t.catalogue.questions}</span></div>
        <div className="card stat"><b style={{ color: 'var(--good)' }}>{attempt.recalled}</b><span>{t.learn.recalledCount}</span></div>
        <div className="card stat"><b style={{ color: 'var(--warn)' }}>{attempt.review}</b><span>{t.learn.toReview}</span></div>
        <div className="card stat"><b>{attempt.unrated}</b><span>{t.exam.unrated}</span></div>
      </div>
      <div className="alert alert-violet">{t.learn.selfNote}</div>
      <div className="card stack">
        <h3 style={{ margin: 0 }}>{t.exam.byDomain}</h3>
        {per.map(({ d, n, r, v }) => (
          <div key={d.id}>
            <div className="spread"><span className="row" style={{ gap: 8 }}><span className="dot" style={{ background: d.color }} />{pick(lang, d.name_en, d.name_ar)}</span><span className="faint ltr">✓ {r} · ↻ {v} · – {n - r - v}</span></div>
            <div className="progress split" style={{ marginTop: 6 }}><i className="good" style={{ width: `${(r / n) * 100}%` }} /><i className="warn" style={{ width: `${(v / n) * 100}%` }} /></div>
          </div>
        ))}
      </div>
      {toReview.length > 0 && (
        <div className="card stack">
          <h3 style={{ margin: 0 }}>{t.learn.reviewPoints}</h3>
          <ol style={{ margin: 0, paddingInlineStart: 22 }}>
            {toReview.map((i) => (
              <li key={i.position} style={{ marginBottom: 8 }}>
                <span lang="en" dir="ltr">{i.prompt}</span>{' '}
                {i.rating === 'review' && <span className="badge badge-warn">↻</span>} {i.flagged && <span className="badge badge-violet">⚑</span>} {!i.rating && <span className="badge badge-draft">–</span>}
                {i.note && <div className="faint" dir="auto">“{i.note}”</div>}
              </li>
            ))}
          </ol>
        </div>
      )}
      <div className="row">
        <Link className="btn btn-primary" href={`/learn/${slug}/mistakes`}>{t.learn.mistakes}</Link>
        <Link className="btn btn-ghost" href={`/learn/${slug}/exams`}>{t.exam.setup}</Link>
      </div>
    </div>
  );
}
