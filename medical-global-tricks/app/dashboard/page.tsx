import Link from 'next/link';
import { pageUser } from '@/lib/auth';
import { getT, pick } from '@/lib/i18n';
import { q } from '@/lib/db';
import { emailConfigured } from '@/lib/email';
import { ResendVerification } from '@/components/AuthForms';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'My learning' };

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const user = await pageUser('/dashboard');
  const sp = await searchParams;
  const { t, lang } = await getT();
  const staff = user.role !== 'student';
  const courses = await q(
    `SELECT c.slug, c.title_en, c.title_ar, c.status, e.expires_at, e.source,
            (SELECT count(*)::int FROM questions x WHERE x.course_id = c.id AND x.status = 'published') AS total,
            (SELECT count(*)::int FROM question_progress p WHERE p.course_id = c.id AND p.user_id = $1 AND p.last_rating = 'recalled') AS recalled,
            (SELECT count(*)::int FROM question_progress p WHERE p.course_id = c.id AND p.user_id = $1 AND p.last_rating = 'review') AS review
       FROM courses c
       LEFT JOIN LATERAL (SELECT expires_at, source FROM enrollments en WHERE en.user_id = $1 AND en.course_id = c.id
                           AND en.status IN ('active','canceled') AND (en.expires_at IS NULL OR en.expires_at > now())
                           ORDER BY en.expires_at DESC NULLS FIRST LIMIT 1) e ON true
      WHERE c.status = 'available' AND ($2 OR e.source IS NOT NULL)
      ORDER BY c.sort_order`, [user.id, staff]);
  const df = new Intl.DateTimeFormat(lang === 'ar' ? 'ar-AE' : 'en-GB', { dateStyle: 'medium' });
  return (
    <>
      <div className="page-head"><div className="container"><h1>{t.nav.dashboard}</h1><p>{t.tagline}</p></div></div>
      <div className="container section stack" style={{ paddingTop: 28 }}>
        {sp.welcome && <div className="alert alert-good">✓ {user.name}</div>}
        {!user.emailVerified && (
          <div className="alert alert-warn spread"><span>{t.auth.notVerified} {!emailConfigured() && t.auth.emailOff}</span>{emailConfigured() && <ResendVerification />}</div>
        )}
        {courses.length === 0 ? (
          <div className="card stack">
            <p style={{ margin: 0 }}>{t.account.none}</p>
            <div><Link className="btn btn-primary" href="/courses">{t.hero.cta}</Link></div>
          </div>
        ) : (
          <div className="grid grid-2">
            {courses.map((c, i) => (
              <div key={c.slug} className="card card-hover stack enter" style={{ ['--i' as any]: i }}>
                <h3 style={{ margin: 0 }}>{pick(lang, c.title_en, c.title_ar)}</h3>
                <div className="progress split"><i className="good" style={{ width: `${c.total ? (c.recalled / c.total) * 100 : 0}%` }} /><i className="warn" style={{ width: `${c.total ? (c.review / c.total) * 100 : 0}%` }} /></div>
                <span className="faint">✓ {c.recalled} · ↻ {c.review} · {c.total} {t.catalogue.questions}</span>
                <span className="faint">{c.source ? (c.expires_at ? `${t.course.expires}: ${df.format(new Date(c.expires_at))}` : t.course.noExpiry) : t.nav.admin}</span>
                <div><Link className="btn btn-dark btn-sm" href={`/learn/${c.slug}`}>{t.learn.continue}</Link></div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
