import { learnCtx } from '@/lib/access';
import { getT, pick } from '@/lib/i18n';
import { q } from '@/lib/db';
import { Icon } from '@/components/Icons';

export const dynamic = 'force-dynamic';

export default async function Summaries({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { course } = await learnCtx(slug);
  const { t, lang } = await getT();
  const files = await q(`SELECT f.id, f.title, f.size_bytes, d.name_en, d.name_ar, d.color FROM course_files f
    LEFT JOIN domains d ON d.id = f.domain_id WHERE f.course_id = $1 AND f.status = 'published' ORDER BY d.sort_order NULLS LAST, f.id`, [course.id]);
  return (
    <div className="stack">
      <h2>{t.learn.summaries}</h2>
      <p className="muted">{t.summaries.intro}</p>
      {files.length === 0 ? <div className="alert alert-info">{t.summaries.none}</div> : (
        <div className="grid grid-3">
          {files.map((f, i) => (
            <a key={f.id} href={`/api/files/${f.id}`} target="_blank" rel="noopener" className="card card-hover enter stack" style={{ ['--i' as any]: i % 9, textDecoration: 'none', color: 'inherit', borderTop: `4px solid ${f.color ?? 'var(--teal-500)'}` }}>
              <span className="row" style={{ gap: 8 }}><Icon name="file" /><b>{f.name_en ? pick(lang, f.name_en, f.name_ar) : f.title}</b></span>
              <span className="faint ltr">PDF · {Math.max(1, Math.round(Number(f.size_bytes) / 1024))} KB · English</span>
              <span className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start' }}>{t.summaries.download}</span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
