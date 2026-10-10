'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from './I18n';
import { api, ApiError } from './api';
import type { DomainLite } from './QuestionLibrary';
import { play } from '@/lib/sound';

export function ExamSetup({ courseId, slug, domains, reviewCount }: { courseId: number; slug: string; domains: (DomainLite & { total: number })[]; reviewCount: number }) {
  const { t, lang } = useI18n();
  const router = useRouter();
  const [mode, setMode] = useState<'mixed' | 'domain' | 'review'>('mixed');
  const [domainId, setDomainId] = useState(String(domains[0]?.id ?? ''));
  const [count, setCount] = useState(10);
  const [minutes, setMinutes] = useState(20);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const max = mode === 'domain' ? domains.find((d) => String(d.id) === domainId)?.total ?? 0 : mode === 'review' ? reviewCount : domains.reduce((s, d) => s + d.total, 0);

  return (
    <form className="card stack" style={{ maxWidth: 640 }} onSubmit={async (e) => {
      e.preventDefault(); setBusy(true); setErr('');
      try {
        const r = await api<{ id: string }>(`/api/courses/${courseId}/exams`, { mode, domainId: mode === 'domain' ? Number(domainId) : undefined, count, minutes });
        play('start');
        router.push(`/learn/${slug}/exams/${r.id}`);
      } catch (x) {
        setErr((x as ApiError).code === 'not_enough_questions' ? t.exam.needMore : t.common.error); setBusy(false);
      }
    }}>
      <h2 style={{ fontSize: '1.3rem' }}>{t.exam.setup}</h2>
      <fieldset className="stack" style={{ border: 0, padding: 0, margin: 0, gap: 8 }}>
        <legend className="label" style={{ marginBottom: 8 }}>{t.exam.mode}</legend>
        <label className="check"><input type="radio" name="mode" checked={mode === 'mixed'} onChange={() => setMode('mixed')} /> {t.exam.mixed}</label>
        <label className="check"><input type="radio" name="mode" checked={mode === 'domain'} onChange={() => setMode('domain')} /> {t.exam.oneDomain}</label>
        <label className="check"><input type="radio" name="mode" checked={mode === 'review'} onChange={() => setMode('review')} disabled={reviewCount === 0} /> {t.exam.fromReview} ({reviewCount})</label>
      </fieldset>
      {mode === 'domain' && (
        <div className="field">
          <label htmlFor="ex-d">{t.exam.domain}</label>
          <select id="ex-d" className="input" value={domainId} onChange={(e) => setDomainId(e.target.value)}>
            {domains.map((d) => <option key={d.id} value={d.id}>{lang === 'ar' ? d.name_ar : d.name_en} ({d.total})</option>)}
          </select>
        </div>
      )}
      <div className="form-grid two">
        <div className="field">
          <label htmlFor="ex-n">{t.exam.count}</label>
          <input id="ex-n" className="input" type="number" min={1} max={Math.min(100, Math.max(max, 1))} value={count} onChange={(e) => setCount(Number(e.target.value))} required />
          <span className="hint">max {Math.min(100, max)}</span>
        </div>
        <div className="field">
          <label htmlFor="ex-m">{t.exam.minutes}</label>
          <input id="ex-m" className="input" type="number" min={1} max={300} value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} required />
        </div>
      </div>
      {err && <div className="alert alert-error" role="alert">{err}</div>}
      <button className="btn btn-primary" disabled={busy || max === 0}>{busy ? t.common.loading : t.exam.start}</button>
      <p className="faint" style={{ margin: 0 }}>{t.learn.selfNote}</p>
    </form>
  );
}
