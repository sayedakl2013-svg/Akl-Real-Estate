import { getT } from '@/lib/i18n';
import { facetValues, listCourses } from '@/lib/catalog';
import { CourseCard } from '@/components/CourseCard';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Courses' };

export default async function Courses({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { t, lang } = await getT();
  const filters = {
    country: sp.country || undefined, authority: sp.authority || undefined, track: sp.track || undefined,
    specialty: sp.specialty || undefined, status: ['available', 'planned'].includes(sp.status ?? '') ? sp.status : undefined,
    q: sp.q?.slice(0, 80) || undefined,
  };
  const [courses, facets] = await Promise.all([listCourses(filters), facetValues()]);
  const labelFor = (k: string, v: string) => (k === 'country' ? t.countries[v] : k === 'track' ? t.tracks[v] : undefined) ?? v;
  return (
    <>
      <div className="page-head">
        <div className="container">
          <h1>{t.catalogue.title}</h1>
          <p>{t.catalogue.intro}</p>
        </div>
      </div>
      <div className="container section stack" style={{ paddingTop: 28 }}>
        <form className="card form-grid" method="get" role="search" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', alignItems: 'end' }}>
          <div className="field">
            <label htmlFor="f-q">{t.catalogue.search}</label>
            <input id="f-q" className="input" name="q" defaultValue={filters.q ?? ''} />
          </div>
          {(['country', 'authority', 'track', 'specialty'] as const).map((k) => (
            <div className="field" key={k}>
              <label htmlFor={`f-${k}`}>{t.catalogue[k]}</label>
              <select id={`f-${k}`} className="input" name={k} defaultValue={filters[k] ?? ''}>
                <option value="">{t.catalogue.all}</option>
                {facets[k].map((v) => <option key={v} value={v}>{labelFor(k, v)}</option>)}
              </select>
            </div>
          ))}
          <div className="field">
            <label htmlFor="f-status">{t.catalogue.status}</label>
            <select id="f-status" className="input" name="status" defaultValue={filters.status ?? ''}>
              <option value="">{t.catalogue.all}</option>
              <option value="available">{t.catalogue.available}</option>
              <option value="planned">{t.catalogue.planned}</option>
            </select>
          </div>
          <button className="btn btn-dark" type="submit">{t.learn.search}</button>
        </form>
        <p className="faint" aria-live="polite">{courses.length} · {t.catalogue.plannedNote}</p>
        {courses.length === 0 ? <div className="alert alert-info">{t.catalogue.none}</div> : (
          <div className="grid grid-3">
            {courses.map((c, i) => <CourseCard key={c.id} c={c} t={t} lang={lang} i={i} />)}
          </div>
        )}
      </div>
    </>
  );
}
