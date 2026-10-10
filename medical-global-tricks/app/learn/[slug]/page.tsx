import Link from 'next/link';
import { learnCtx } from '@/lib/access';
import { getT, pick } from '@/lib/i18n';
import { attemptsFor, domainStats } from '@/lib/study';
import { one } from '@/lib/db';
import { emailConfigured } from '@/lib/email';
import { ResendVerification } from '@/components/AuthForms';

export const dynamic = 'force-dynamic';

export default async function LearnDashboard({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { user, course } = await learnCtx(slug);
  const { t, lang } = await getT();
  const [stats, attempts, plan] = await Promise.all([
    domainStats(user.id, course.id),
    attemptsFor(user.id, course.id, 5),
    one<{ total: number; done: number }>(
      `SELECT count(i.id)::int AS total, count(p.item_id)::int AS done FROM study_plan_items i
         LEFT JOIN study_plan_progress p ON p.item_id = i.id AND p.user_id = $1 WHERE i.course_id = $2`, [user.id, course.id]),
  ]);
  const total = stats.reduce((s, d) => s + d.total, 0);
  const recalled = stats.reduce((s, d) => s + d.recalled, 0);
  const review = stats.reduce((s, d) => s + d.review, 0);
  const open = attempts.find((a) => a.status === 'in_progress');
  const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0);
  const df = new Intl.DateTimeFormat(lang === 'ar' ? 'ar-AE' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' });

  return (
    <div className="stack">
      {!user.emailVerified && (
        <div className="alert alert-warn spread">
          <span>{t.auth.notVerified} {!emailConfigured() && t.auth.emailOff}</span>
          {emailConfigured() && <ResendVerification />}
        </div>
      )}
      {open && (
        <div className="alert alert-info spread">
          <span><b>{t.learn.openAttempt}</b></span>
          <Link className="btn btn-dark btn-sm" href={`/learn/${slug}/exams/${open.id}`}>{t.learn.resume}</Link>
        </div>
      )}
      <div className="grid grid-4">
        {[
          [total, t.catalogue.questions],
          [recalled + review, t.learn.seen],
          [recalled, t.learn.recalledCount],
          [review, t.learn.reviewPoints],
        ].map(([n, label], i) => (
          <div className="card stat enter" key={String(label)} style={{ ['--i' as any]: i }}><b>{n}</b><span>{label}</span></div>
        ))}
      </div>

      <div className="row">
        <Link className="btn btn-primary" href={`/learn/${slug}/practice`}>{t.learn.startPractice}</Link>
        <Link className="btn btn-ghost" href={`/learn/${slug}/exams`}>{t.exam.setup}</Link>
        {review > 0 && <Link className="btn btn-warn" href={`/learn/${slug}/mistakes`}>{t.learn.mistakes} ({review})</Link>}
      </div>

      <div className="card stack">
        <div className="spread"><h2 style={{ fontSize: '1.25rem', margin: 0 }}>{t.learn.progress}</h2>
          <div className="legend"><span><i className="dot" style={{ background: 'var(--teal-500)' }} />{t.learn.recalledCount}</span><span><i className="dot" style={{ background: '#f59e0b' }} />{t.learn.toReview}</span></div>
        </div>
        <div className="grid grid-2">
          {stats.map((d, i) => (
            <Link key={d.id} href={`/learn/${slug}/practice?domain=${d.id}`} className="card card-hover enter" style={{ ['--i' as any]: i % 8, textDecoration: 'none', color: 'inherit', padding: 14 }}>
              <div className="spread" style={{ marginBottom: 8 }}>
                <span className="row" style={{ gap: 8 }}><span className="dot" style={{ background: d.color }} /><b>{pick(lang, d.name_en, d.name_ar)}</b></span>
                <span className="faint">{d.recalled}/{d.total}</span>
              </div>
              <div className="progress split" role="img" aria-label={`${d.recalled} ${t.learn.recalledCount}, ${d.review} ${t.learn.toReview}, ${d.total}`}>
                <i className="good" style={{ width: `${pct(d.recalled, d.total)}%` }} />
                <i className="warn" style={{ width: `${pct(d.review, d.total)}%` }} />
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card stack">
          <div className="spread"><h2 style={{ fontSize: '1.15rem', margin: 0 }}>{t.learn.lastAttempts}</h2><Link href={`/learn/${slug}/history`}>{t.learn.history}</Link></div>
          {attempts.length === 0 ? <p className="muted" style={{ margin: 0 }}>{t.exam.none}</p> : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {attempts.map((a) => (
                <li key={a.id} className="spread" style={{ padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
                  <span className="faint">{df.format(new Date(a.started_at))}</span>
                  <span>{a.status === 'in_progress' ? t.exam.in_progress : `✓ ${a.recalled} · ↻ ${a.review} · – ${a.unrated}`}</span>
                  <Link href={`/learn/${slug}/exams/${a.id}${a.status === 'in_progress' ? '' : '/result'}`}>{a.status === 'in_progress' ? t.learn.resume : t.exam.view}</Link>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="card stack">
          <div className="spread"><h2 style={{ fontSize: '1.15rem', margin: 0 }}>{t.learn.plan}</h2><Link href={`/learn/${slug}/plan`}>{t.learn.continue}</Link></div>
          <div className="progress"><i style={{ width: `${pct(plan?.done ?? 0, plan?.total ?? 0)}%` }} /></div>
          <span className="faint">{plan?.done ?? 0} / {plan?.total ?? 0} {t.plan.done}</span>
        </div>
      </div>
      <p className="faint">{t.learn.selfNote}</p>
    </div>
  );
}
