'use client';
import { useI18n } from './I18n';

export interface QView { id: number; domain_id: number; prompt: string; answer: string; detail_html: string; source: string; verification_note: string | null }

/** Reference answer block. detail_html is sanitised on the server when content is imported or edited. */
export function AnswerPanel({ q }: { q: QView }) {
  const { t } = useI18n();
  return (
    <div className="answer-panel" lang="en" dir="ltr" style={{ textAlign: 'left' }}>
      <div className="label" style={{ marginBottom: 6 }}>{t.learn.reference}</div>
      <div className="answer-line">{q.answer}</div>
      {q.detail_html && (
        <>
          <div className="label" style={{ marginBottom: 6 }}>{t.learn.explanation}</div>
          <div className="detail" dangerouslySetInnerHTML={{ __html: q.detail_html }} />
        </>
      )}
      {q.verification_note && <div className="verify-note"><b>⚠ {t.learn.verification}:</b> {q.verification_note}</div>}
      {q.source && <div className="source-tag"><span aria-hidden="true">📎</span><span><b>{t.learn.source}:</b> {q.source}</span></div>}
    </div>
  );
}

export function DomainTag({ d }: { d?: { name_en: string; name_ar: string; color: string } }) {
  const { lang } = useI18n();
  if (!d) return null;
  return (
    <span className="badge" style={{ background: '#f4f6fa', borderColor: 'var(--line)', color: 'var(--navy-800)' }}>
      <span className="dot" style={{ background: d.color }} /> {lang === 'ar' ? d.name_ar : d.name_en}
    </span>
  );
}
