import Link from 'next/link';
import { getT } from '@/lib/i18n';
import { getUser } from '@/lib/auth';
import { listCourses } from '@/lib/catalog';
import { one } from '@/lib/db';
import { CourseCard } from '@/components/CourseCard';
import { HeroVisual } from '@/components/HeroVisual';
import { VideoPlayer } from '@/components/VideoPlayer';
import { Icon } from '@/components/Icons';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const [{ t, lang }, user, courses] = await Promise.all([getT(), getUser(), listCourses()]);
  const teaser = await one(`SELECT id, title_en, title_ar, mime FROM videos WHERE kind = 'promo' AND status = 'published' AND access = 'public' AND source_type = 'file' ORDER BY sort_order, id LIMIT 1`);
  const other = lang === 'ar' ? 'Learn with clarity. Practise with confidence.' : 'ذاكر بوضوح. وتدرّب بثقة.';
  const [first, second] = t.tagline.split(/(?<=\.)\s+/);
  return (
    <>
      <section className="hero">
        <div className="orb a" /><div className="orb b" />
        <div className="container">
          <div>
            <span className="kicker enter"><Icon name="shield" /> {t.hero.kicker}</span>
            <h1 className="enter" style={{ ['--i' as any]: 1 }}>{first} <span className="accent">{second}</span></h1>
            <p className="enter" style={{ ['--i' as any]: 2, color: '#9fb3cf', fontWeight: 600 }}><bdi lang={lang === 'ar' ? 'en' : 'ar'}>{other}</bdi></p>
            <p className="lead enter" style={{ ['--i' as any]: 3 }}>{t.hero.body}</p>
            <div className="row enter" style={{ ['--i' as any]: 4, marginTop: 24 }}>
              <Link className="btn btn-primary" href="/courses">{t.hero.cta}</Link>
              {user && <Link className="btn btn-outline-light" href="/dashboard">{t.hero.cta2}</Link>}
              {!user && <Link className="btn btn-outline-light" href="/register">{t.nav.register}</Link>}
            </div>
            <ul className="points enter" style={{ ['--i' as any]: 5 }}>{t.hero.points.map((p) => <li key={p}>{p}</li>)}</ul>
          </div>
          <HeroVisual />
        </div>
      </section>

      <section className="section">
        <div className="container stack">
          <div className="spread">
            <div>
              <h2>{t.catalogue.title}</h2>
              <p className="muted" style={{ margin: 0 }}>{t.catalogue.intro}</p>
            </div>
            <Link className="btn btn-ghost" href="/courses">{t.hero.cta}</Link>
          </div>
          <div className="grid grid-3">
            {courses.slice(0, 6).map((c, i) => <CourseCard key={c.id} c={c} t={t} lang={lang} i={i} />)}
          </div>
          <p className="faint">{t.catalogue.plannedNote}</p>
        </div>
      </section>

      <section className="section" style={{ background: 'var(--surface)', borderBlock: '1px solid var(--line)' }}>
        <div className="container stack">
          <h2>{t.how.title}</h2>
          <div className="grid grid-4">
            {t.how.steps.map(([title, body], i) => (
              <div key={title} className="card enter" style={{ ['--i' as any]: i }}>
                <div className="badge badge-teal" style={{ marginBottom: 10 }}>{i + 1}</div>
                <h3>{title}</h3>
                <p className="muted" style={{ margin: 0 }}>{body}</p>
              </div>
            ))}
          </div>
          <div className="alert alert-violet">{t.learn.selfNote}</div>
        </div>
      </section>

      {teaser && (
        <section className="section">
          <div className="container narrow stack" style={{ maxWidth: 520 }}>
            <h2>{t.teaser.title}</h2>
            <VideoPlayer src={`/api/videos/${teaser.id}`} mime={teaser.mime ?? 'video/mp4'} title={lang === 'ar' ? teaser.title_ar : teaser.title_en} playLabel={t.teaser.play} />
            <p className="faint">{t.teaser.note}</p>
          </div>
        </section>
      )}
    </>
  );
}
