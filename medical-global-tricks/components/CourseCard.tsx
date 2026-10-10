import Link from 'next/link';
import type { CourseRow } from '@/lib/catalog';
import type { Dict, Lang } from '@/lib/dict';
import { Icon } from './Icons';

export function StatusBadge({ status, t }: { status: string; t: Dict }) {
  const label = (t.catalogue as any)[status] ?? status;
  return <span className={`badge badge-${status === 'available' ? 'available' : status === 'planned' ? 'planned' : 'draft'}`}>{label}</span>;
}

export function CourseCard({ c, t, lang, i = 0 }: { c: CourseRow; t: Dict; lang: Lang; i?: number }) {
  const title = lang === 'ar' ? c.title_ar : c.title_en;
  const summary = lang === 'ar' ? c.summary_ar : c.summary_en;
  return (
    <article className={`card card-hover course-card enter ${c.status}`} style={{ ['--i' as any]: i }}>
      <div className="meta">
        <StatusBadge status={c.status} t={t} />
        <span className="badge badge-teal">{t.countries[c.country] ?? c.country}</span>
        <span className="badge badge-violet ltr">{c.authority}</span>
      </div>
      <h3>{title}</h3>
      <p className="muted" style={{ margin: 0 }}>{summary}</p>
      <div className="row faint">
        <span>{t.tracks[c.track] ?? c.track}</span>·<span>{t.formats[c.exam_format] ?? c.exam_format}</span>
        {c.status === 'available' && <>·<span>{c.question_count} {t.catalogue.questions}</span>·<span>{c.domain_count} {t.catalogue.domains}</span></>}
      </div>
      <div className="foot">
        <Link className={`btn btn-sm ${c.status === 'available' ? 'btn-dark' : 'btn-ghost'}`} href={`/courses/${c.slug}`}>
          {t.catalogue.open} <Icon name="arrow" className="flip-rtl" />
        </Link>
      </div>
    </article>
  );
}
