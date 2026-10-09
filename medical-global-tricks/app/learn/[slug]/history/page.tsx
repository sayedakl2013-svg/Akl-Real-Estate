import Link from 'next/link';
import { learnCtx } from '@/lib/access';
import { getT, pick } from '@/lib/i18n';
import { attemptsFor } from '@/lib/study';
import { q } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function History({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { user, course } = await learnCtx(slug);
  const [{ t, lang }, attempts, perDomain, daily] = await Promise.all([
    getT(),
    attemptsFor(user.id, course.id, 100),
    q(`SELECT d.id, d.name_en, d.name_ar, d.color,
              count(e.id) FILTER (WHERE e.rating = 'recalled')::int AS recalled,
              count(e.id) FILTER (WHERE e.rating = 'review')::int AS review
         FROM domains d LEFT JOIN questions qq ON qq.domain_id = d.id
         LEFT JOIN rating_events e ON e.question_id = qq.id AND e.user_id = $1
        WHERE d.course_id = $2 GROUP BY d.id ORDER BY d.sort_order`, [user.id, course.id]),
    q(`SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS day, count(*)::int AS n,
              count(*) FILTER (WHERE rating = 'recalled')::int AS recalled
         FROM rating_events WHERE user_id = $1 AND course_id = $2 AND created_at > now() - interval '14 days'
        GROUP BY 1 ORDER BY 1`, [user.id, course.id]),
  ]);
  const df = new Intl.DateTimeFormat(lang === 'ar' ? 'ar-AE' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' });
  const maxDay = Math.max(1, ...daily.map((d) => d.n));
  return (
    <div className="stack">
      <h2>{t.learn.history}</h2>
      <div className="alert alert-violet">{t.learn.selfNote}</div>
      <div className="card stack">
        <h3 style={{ margin: 0 }}>{t.exam.byDomain}</h3>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>{t.exam.domain}</th><th>✓ {t.learn.recalled}</th><th>↻ {t.learn.review}</th><th>%</th><th style={{ minWidth: 140 }} /></tr></thead>
            <tbody>
              {perDomain.map((d) => {
                const n = d.recalled + d.review;
                const p = n ? Math.round((d.recalled / n) * 100) : null;
                return (
                  <tr key={d.id}>
                    <td><span className="row" style={{ gap: 8, flexWrap: 'nowrap' }}><span className="dot" style={{ background: d.color }} />{pick(lang, d.name_en, d.name_ar)}</span></td>
                    <td>{d.recalled}</td><td>{d.review}</td><td>{p === null ? '—' : `${p}%`}</td>
                    <td><div className="progress"><i style={{ width: `${p ?? 0}%` }} /></div></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      {daily.length > 0 && (
        <div className="card stack">
          <h3 style={{ margin: 0 }}>14 days</h3>
          <div className="ltr" style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 120 }} role="img" aria-label={daily.map((d) => `${d.day}: ${d.n}`).join(', ')}>
            {daily.map((d) => (
              <div key={d.day} title={`${d.day}: ${d.recalled}/${d.n}`} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: '100%' }}>
                <div style={{ height: `${(d.n / maxDay) * 100}%`, background: 'linear-gradient(180deg, var(--teal-400), var(--violet-500))', borderRadius: '6px 6px 2px 2px', minHeight: 4 }} />
                <span className="faint" style={{ fontSize: 11, textAlign: 'center' }}>{d.day.slice(5)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="card stack">
        <h3 style={{ margin: 0 }}>{t.learn.attempts}</h3>
        {attempts.length === 0 ? <p className="muted">{t.exam.none}</p> : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>{t.exam.started}</th><th>{t.exam.count}</th><th>{t.exam.status}</th><th>✓</th><th>↻</th><th>–</th><th /></tr></thead>
              <tbody>
                {attempts.map((a) => (
                  <tr key={a.id}>
                    <td>{df.format(new Date(a.started_at))}</td><td>{a.question_count}</td>
                    <td>{a.status === 'in_progress' ? t.exam.in_progress : a.status === 'expired' ? t.exam.expiredStatus : t.exam.submittedStatus}</td>
                    <td>{a.recalled}</td><td>{a.review}</td><td>{a.unrated}</td>
                    <td><Link href={`/learn/${slug}/exams/${a.id}${a.status === 'in_progress' ? '' : '/result'}`}>{t.exam.view}</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
