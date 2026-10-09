'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useI18n } from './I18n';
import { api } from './api';
import { AnswerPanel, DomainTag, type QView } from './AnswerPanel';
import type { DomainLite } from './QuestionLibrary';
import { Icon } from './Icons';
import { play } from '@/lib/sound';

type Row = QView & { last_rating: 'recalled' | 'review' | null; saved: boolean };

function shuffle<T>(a: T[]) {
  const b = a.slice();
  for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; }
  return b;
}

export function PracticeSession({ courseId, slug, domains, initialDomain, initialFilter, autostart }:
  { courseId: number; slug: string; domains: DomainLite[]; initialDomain: string; initialFilter: string; autostart: boolean }) {
  const { t, lang } = useI18n();
  const [domain, setDomain] = useState(initialDomain);
  const [filter, setFilter] = useState(initialFilter);
  const [queue, setQueue] = useState<Row[] | null>(null);
  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [ratings, setRatings] = useState<Record<number, 'recalled' | 'review'>>({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const byId = Object.fromEntries(domains.map((d) => [d.id, d]));

  const start = useCallback(async (onlyIds?: number[]) => {
    setLoading(true); setError('');
    try {
      const p = new URLSearchParams({ limit: '500' });
      if (domain && !onlyIds) p.set('domain', domain);
      if (filter && !onlyIds) p.set('filter', filter);
      const r = await api<{ rows: Row[] }>(`/api/courses/${courseId}/questions?${p}`);
      const rows = onlyIds ? r.rows.filter((x) => onlyIds.includes(x.id)) : r.rows;
      if (!rows.length) { setError(t.learn.noResults); return; }
      setQueue(shuffle(rows)); setIdx(0); setRevealed(false); setRatings({});
      play('start');
    } catch { setError(t.common.error); } finally { setLoading(false); }
  }, [courseId, domain, filter, t]);

  useEffect(() => { if (autostart) void start(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const current = queue?.[idx];
  const done = queue && idx >= queue.length;

  const rate = useCallback(async (rating: 'recalled' | 'review') => {
    if (!current) return;
    setRatings((r) => ({ ...r, [current.id]: rating }));
    play('save');
    api(`/api/courses/${courseId}/rate`, { questionId: current.id, rating }).catch(() => setError(t.exam.offline));
    setIdx((i) => i + 1); setRevealed(false);
  }, [current, courseId, t]);

  useEffect(() => {
    if (!current) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(tag) && e.key === ' ') return;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return;
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); setRevealed((v) => !v); play('tap'); }
      else if (e.key === '1' && revealed) void rate('recalled');
      else if (e.key === '2' && revealed) void rate('review');
      else if (e.key === (lang === 'ar' ? 'ArrowLeft' : 'ArrowRight')) { setIdx((i) => Math.min(i + 1, queue!.length)); setRevealed(false); }
      else if (e.key === (lang === 'ar' ? 'ArrowRight' : 'ArrowLeft')) { setIdx((i) => Math.max(i - 1, 0)); setRevealed(false); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [current, revealed, rate, queue, lang]);

  useEffect(() => { if (done) play('finish'); }, [done]);

  if (!queue) {
    return (
      <div className="card stack" style={{ maxWidth: 640 }}>
        <h2 style={{ fontSize: '1.3rem' }}>{t.learn.practice}</h2>
        <div className="field">
          <label htmlFor="p-d">{t.exam.domain}</label>
          <select id="p-d" className="input" value={domain} onChange={(e) => setDomain(e.target.value)}>
            <option value="">{t.learn.everything}</option>
            {domains.map((d) => <option key={d.id} value={d.id}>{lang === 'ar' ? d.name_ar : d.name_en}</option>)}
          </select>
        </div>
        <fieldset className="stack" style={{ border: 0, padding: 0, margin: 0, gap: 8 }}>
          {[['', t.catalogue.all], ['review', t.learn.onlyReview], ['saved', t.learn.onlySaved], ['unrated', t.exam.unrated]].map(([v, label]) => (
            <label className="check" key={v}><input type="radio" name="pf" checked={filter === v} onChange={() => setFilter(v)} /> {label}</label>
          ))}
        </fieldset>
        {error && <div className="alert alert-info" role="status">{error}</div>}
        <button className="btn btn-primary" disabled={loading} onClick={() => start()}>{loading ? t.common.loading : t.learn.startPractice}</button>
        <p className="faint" style={{ margin: 0 }}>{t.learn.selfNote}</p>
      </div>
    );
  }

  if (done) {
    const vals = Object.values(ratings);
    const missed = Object.entries(ratings).filter(([, v]) => v === 'review').map(([k]) => Number(k));
    return (
      <div className="card stack enter" style={{ textAlign: 'center', maxWidth: 640 }}>
        <div style={{ fontSize: 40 }} aria-hidden="true">✓</div>
        <h2>{t.learn.sessionDone}</h2>
        <p className="muted">✓ {vals.filter((v) => v === 'recalled').length} {t.learn.recalledCount} · ↻ {missed.length} {t.learn.toReview}</p>
        <div className="row" style={{ justifyContent: 'center' }}>
          {missed.length > 0 && <button className="btn btn-warn" onClick={() => start(missed)}>{t.learn.retrain}</button>}
          <button className="btn btn-ghost" onClick={() => start()}>{t.learn.again}</button>
          <Link className="btn btn-ghost" href={`/learn/${slug}`}>{t.learn.back}</Link>
        </div>
        <p className="faint">{t.learn.selfNote}</p>
      </div>
    );
  }

  const q = current!;
  const d = byId[q.domain_id];
  return (
    <div className="stack" style={{ maxWidth: 820 }}>
      <div className="spread">
        <span className="faint ltr">{idx + 1} / {queue.length}</span>
        <span className="faint">✓ {Object.values(ratings).filter((v) => v === 'recalled').length} · ↻ {Object.values(ratings).filter((v) => v === 'review').length}</span>
      </div>
      <div className="progress" aria-hidden="true"><i style={{ width: `${(idx / queue.length) * 100}%`, animation: 'none', transition: 'width .4s var(--ease)' }} /></div>
      <article className="study-card" key={q.id} style={{ ['--domain' as any]: d?.color }} aria-live="polite">
        <div className="spread"><DomainTag d={d} /></div>
        <p className="study-q" lang="en" dir="ltr" style={{ textAlign: 'left' }}>{q.prompt}</p>
        {!revealed ? (
          <button className="btn btn-dark btn-block" style={{ marginTop: 22 }} onClick={() => { setRevealed(true); play('tap'); }}>{t.learn.reveal}</button>
        ) : (
          <>
            <AnswerPanel q={q} />
            <div className="rate-bar">
              <button className="btn btn-good" onClick={() => rate('recalled')}>✓ {t.learn.recalled} <kbd>1</kbd></button>
              <button className="btn btn-warn" onClick={() => rate('review')}>↻ {t.learn.review} <kbd>2</kbd></button>
            </div>
          </>
        )}
      </article>
      <div className="spread">
        <button className="btn btn-ghost btn-sm" disabled={idx === 0} onClick={() => { setIdx(idx - 1); setRevealed(false); }}>
          <Icon name="arrow" className={lang === 'ar' ? '' : 'flip-ltr'} /> {t.learn.prev}
        </button>
        <button className="btn btn-ghost btn-sm" onClick={() => { setIdx(idx + 1); setRevealed(false); }}>
          {t.learn.next} <Icon name="arrow" className="flip-rtl" />
        </button>
      </div>
      <p className="kbd-hint">{t.learn.keyboard}</p>
      {error && <div className="alert alert-warn" role="status">{error}</div>}
    </div>
  );
}
