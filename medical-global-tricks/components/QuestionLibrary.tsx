'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useI18n } from './I18n';
import { api } from './api';
import { AnswerPanel, DomainTag, type QView } from './AnswerPanel';
import { Icon } from './Icons';
import { play } from '@/lib/sound';

export interface DomainLite { id: number; name_en: string; name_ar: string; color: string }
type Row = QView & { last_rating: 'recalled' | 'review' | null; saved: boolean };

export function QuestionLibrary({ courseId, domains, initialFilter = '' }: { courseId: number; domains: DomainLite[]; initialFilter?: string }) {
  const { t, lang } = useI18n();
  const [text, setText] = useState('');
  const [domain, setDomain] = useState('');
  const [filter, setFilter] = useState(initialFilter);
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<Record<number, boolean>>({});
  const byId = Object.fromEntries(domains.map((d) => [d.id, d]));
  const reqId = useRef(0);

  const load = useCallback(async (offset: number) => {
    const id = ++reqId.current;
    setLoading(true);
    const p = new URLSearchParams({ offset: String(offset), limit: '30' });
    if (text) p.set('q', text);
    if (domain) p.set('domain', domain);
    if (filter) p.set('filter', filter);
    try {
      const r = await api<{ rows: Row[]; total: number }>(`/api/courses/${courseId}/questions?${p}`);
      if (id !== reqId.current) return;
      setRows((prev) => (offset === 0 ? r.rows : [...prev, ...r.rows]));
      setTotal(r.total);
    } finally {
      if (id === reqId.current) setLoading(false);
    }
  }, [courseId, text, domain, filter]);

  useEffect(() => {
    const h = setTimeout(() => load(0), 250); // debounce typing
    return () => clearTimeout(h);
  }, [load]);

  const patch = (id: number, p: Partial<Row>) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...p } : r)));
  const toggleSave = async (r: Row) => {
    patch(r.id, { saved: !r.saved });
    try { await api(`/api/courses/${courseId}/bookmark`, { questionId: r.id, saved: !r.saved }); play('save'); }
    catch { patch(r.id, { saved: r.saved }); }
  };
  const rate = async (r: Row, rating: 'recalled' | 'review') => {
    patch(r.id, { last_rating: rating });
    try { await api(`/api/courses/${courseId}/rate`, { questionId: r.id, rating }); play('save'); }
    catch { patch(r.id, { last_rating: r.last_rating }); }
  };

  return (
    <div className="stack">
      <div className="card form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', alignItems: 'end' }} role="search">
        <div className="field">
          <label htmlFor="lib-q">{t.learn.search}</label>
          <input id="lib-q" className="input" type="search" value={text} onChange={(e) => setText(e.target.value)} placeholder="ptosis, hyaluronidase…" dir="auto" />
        </div>
        <div className="field">
          <label htmlFor="lib-d">{t.exam.domain}</label>
          <select id="lib-d" className="input" value={domain} onChange={(e) => setDomain(e.target.value)}>
            <option value="">{t.learn.allDomains}</option>
            {domains.map((d) => <option key={d.id} value={d.id}>{lang === 'ar' ? d.name_ar : d.name_en}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="lib-f">{t.catalogue.status}</label>
          <select id="lib-f" className="input" value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="">{t.catalogue.all}</option>
            <option value="saved">{t.learn.saved}</option>
            <option value="review">{t.learn.toReview}</option>
            <option value="unrated">{t.exam.unrated}</option>
          </select>
        </div>
      </div>
      <p className="faint" aria-live="polite" style={{ margin: 0 }}>{loading ? t.common.loading : `${total} ${t.learn.results}`}</p>
      {!loading && rows.length === 0 && <div className="alert alert-info">{t.learn.noResults}</div>}
      <div className="stack" style={{ gap: 10 }}>
        {rows.map((r) => (
          <div key={r.id} className="q-item" style={{ borderInlineStart: `4px solid ${byId[r.domain_id]?.color ?? 'var(--line)'}` }}>
            <button className="q-head" aria-expanded={!!open[r.id]} onClick={() => { setOpen({ ...open, [r.id]: !open[r.id] }); play('tap'); }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="row" style={{ gap: 6, marginBottom: 6 }}>
                  <DomainTag d={byId[r.domain_id]} />
                  {r.last_rating === 'recalled' && <span className="badge badge-available">✓ {t.learn.recalled}</span>}
                  {r.last_rating === 'review' && <span className="badge badge-warn">↻ {t.learn.review}</span>}
                  {r.saved && <span className="badge badge-violet">★ {t.learn.unsave}</span>}
                </div>
                <div lang="en" dir="ltr" style={{ fontWeight: 700, color: 'var(--navy-900)', textAlign: 'left' }}>{r.prompt}</div>
              </div>
              <span aria-hidden="true" style={{ fontSize: 20, color: 'var(--ink-faint)' }}>{open[r.id] ? '−' : '+'}</span>
            </button>
            {open[r.id] && (
              <div className="q-body">
                <AnswerPanel q={r} />
                <div className="row" style={{ marginTop: 14 }}>
                  <button className="btn btn-good btn-sm" onClick={() => rate(r, 'recalled')} aria-pressed={r.last_rating === 'recalled'}>✓ {t.learn.recalled}</button>
                  <button className="btn btn-warn btn-sm" onClick={() => rate(r, 'review')} aria-pressed={r.last_rating === 'review'}>↻ {t.learn.review}</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => toggleSave(r)} aria-pressed={r.saved}><Icon name="bookmark" /> {r.saved ? t.learn.unsave : t.learn.save}</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      {rows.length < total && (
        <button className="btn btn-ghost" disabled={loading} onClick={() => load(rows.length)}>{loading ? t.common.loading : `${t.learn.next} (${rows.length}/${total})`}</button>
      )}
    </div>
  );
}
