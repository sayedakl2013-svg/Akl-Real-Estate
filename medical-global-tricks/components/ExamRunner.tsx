'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from './I18n';
import { api, ApiError } from './api';
import { AnswerPanel, DomainTag, type QView } from './AnswerPanel';
import type { DomainLite } from './QuestionLibrary';
import { Icon } from './Icons';
import { play } from '@/lib/sound';

interface Item extends QView { position: number; revealed: boolean; rating: 'recalled' | 'review' | null; flagged: boolean; note: string }
type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export function ExamRunner({ attemptId, slug, secondsLeft, items: initial, domains }:
  { attemptId: string; slug: string; secondsLeft: number; items: Item[]; domains: DomainLite[] }) {
  const { t, lang } = useI18n();
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [idx, setIdx] = useState(() => Math.max(0, initial.findIndex((i) => !i.rating)));
  const [deadline] = useState(() => Date.now() + secondsLeft * 1000);
  const [left, setLeft] = useState(secondsLeft);
  const [save, setSave] = useState<SaveState>('idle');
  const [submitting, setSubmitting] = useState(false);
  const pending = useRef(new Map<number, Partial<Item>>());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const byId = Object.fromEntries(domains.map((d) => [d.id, d]));
  const cur = items[idx];

  useEffect(() => {
    window.scrollTo(0, 0); // keep the question clear of the sticky timer bar after navigation
    document.body.classList.add('focus-mode');
    return () => document.body.classList.remove('focus-mode');
  }, []);

  // Batched, retried autosave: changes are queued per question and flushed shortly after the last edit.
  const flush = useCallback(async () => {
    if (!pending.current.size) return;
    const batch = [...pending.current.entries()];
    pending.current.clear();
    setSave('saving');
    try {
      for (const [pos, patch] of batch) await api(`/api/exams/${attemptId}/items/${pos}`, patch, 'PATCH');
      setSave('saved');
    } catch (e) {
      if (e instanceof ApiError && e.code === 'attempt_closed') { router.replace(`/learn/${slug}/exams/${attemptId}/result?expired=1`); return; }
      for (const [pos, patch] of batch) pending.current.set(pos, { ...patch, ...pending.current.get(pos) });
      setSave('error');
      timer.current = setTimeout(flush, 3000);
    }
  }, [attemptId, router, slug]);

  const update = (pos: number, patch: Partial<Item>, immediate = false) => {
    setItems((xs) => xs.map((x) => (x.position === pos ? { ...x, ...patch } : x)));
    pending.current.set(pos, { ...pending.current.get(pos), ...patch });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, immediate ? 0 : 800);
  };

  const submit = useCallback(async (auto = false) => {
    if (!auto && !window.confirm(t.exam.confirmSubmit)) return;
    setSubmitting(true);
    if (timer.current) clearTimeout(timer.current);
    await flush().catch(() => {});
    try { await api(`/api/exams/${attemptId}/submit`, {}); } catch {}
    play('finish');
    router.replace(`/learn/${slug}/exams/${attemptId}/result${auto ? '?expired=1' : ''}`);
  }, [attemptId, flush, router, slug, t]);

  useEffect(() => {
    const h = setInterval(() => {
      const s = Math.max(0, Math.round((deadline - Date.now()) / 1000));
      setLeft(s);
      if (s === 0) { clearInterval(h); void submit(true); }
    }, 1000);
    return () => clearInterval(h);
  }, [deadline, submit]);

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => { if (pending.current.size) { e.preventDefault(); } };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(tag)) return;
      if (e.key === ' ') { e.preventDefault(); if (!cur.revealed) update(cur.position, { revealed: true }, true); }
      else if (e.key === '1' && cur.revealed) update(cur.position, { rating: 'recalled' }, true);
      else if (e.key === '2' && cur.revealed) update(cur.position, { rating: 'review' }, true);
      else if (e.key.toLowerCase() === 'f') update(cur.position, { flagged: !cur.flagged });
      else if (e.key === (lang === 'ar' ? 'ArrowLeft' : 'ArrowRight')) setIdx((i) => Math.min(i + 1, items.length - 1));
      else if (e.key === (lang === 'ar' ? 'ArrowRight' : 'ArrowLeft')) setIdx((i) => Math.max(i - 1, 0));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const mm = String(Math.floor(left / 60)).padStart(2, '0');
  const ss = String(left % 60).padStart(2, '0');
  const rated = items.filter((i) => i.rating).length;

  return (
    <div className="stack">
      <div className="exam-top">
        <div className="spread">
          <div className="row">
            <Icon name="timer" />
            <span className="sr-only">{t.exam.remaining}</span>
            <span className={`timer ${left < 60 ? 'low' : ''}`} role="timer" aria-live={left < 60 ? 'polite' : 'off'}>{mm}:{ss}</span>
          </div>
          <span className="faint" aria-live="polite">
            {save === 'saving' ? t.exam.saving : save === 'saved' ? t.exam.savedOk : save === 'error' ? t.exam.offline : ''}
          </span>
          <span className="faint ltr">{rated}/{items.length}</span>
          <button className="btn btn-dark btn-sm" disabled={submitting} onClick={() => submit(false)}>{t.exam.submit}</button>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 1fr)' }}>
        <article className="study-card" style={{ ['--domain' as any]: byId[cur.domain_id]?.color }}>
          <div className="spread">
            <span className="row" style={{ gap: 8 }}><span className="badge badge-draft ltr">{idx + 1} {t.exam.of} {items.length}</span><DomainTag d={byId[cur.domain_id]} /></span>
            <button className={`btn btn-sm ${cur.flagged ? 'btn-warn' : 'btn-ghost'}`} aria-pressed={cur.flagged} onClick={() => update(cur.position, { flagged: !cur.flagged })}>
              <Icon name="flag" /> {cur.flagged ? t.exam.unflag : t.exam.flag}
            </button>
          </div>
          <p className="study-q" lang="en" dir="ltr" style={{ textAlign: 'left' }}>{cur.prompt}</p>
          <p className="faint" style={{ marginTop: 10 }}>{t.exam.answerAloud}</p>
          <div className="field">
            <label htmlFor={`note-${cur.position}`} className="label">{t.exam.notes}</label>
            <textarea id={`note-${cur.position}`} className="input" dir="auto" value={cur.note} maxLength={4000} onChange={(e) => update(cur.position, { note: e.target.value })} />
          </div>
          {!cur.revealed ? (
            <button className="btn btn-dark btn-block" style={{ marginTop: 14 }} onClick={() => { update(cur.position, { revealed: true }, true); play('tap'); }}>{t.learn.reveal}</button>
          ) : (
            <>
              <AnswerPanel q={cur} />
              <div className="rate-bar">
                <button className="btn btn-good" aria-pressed={cur.rating === 'recalled'} onClick={() => { update(cur.position, { rating: 'recalled' }, true); play('save'); }}>✓ {t.learn.recalled}</button>
                <button className="btn btn-warn" aria-pressed={cur.rating === 'review'} onClick={() => { update(cur.position, { rating: 'review' }, true); play('save'); }}>↻ {t.learn.review}</button>
              </div>
            </>
          )}
          <div className="spread" style={{ marginTop: 18 }}>
            <button className="btn btn-ghost btn-sm" disabled={idx === 0} onClick={() => setIdx(idx - 1)}><Icon name="arrow" className="flip-ltr" /> {t.learn.prev}</button>
            <button className="btn btn-ghost btn-sm" disabled={idx === items.length - 1} onClick={() => setIdx(idx + 1)}>{t.learn.next} <Icon name="arrow" className="flip-rtl" /></button>
          </div>
        </article>

        <section className="card stack" aria-labelledby="nav-h">
          <h3 id="nav-h" style={{ margin: 0 }}>{t.exam.navigator}</h3>
          <div className="nav-grid ltr">
            {items.map((it, i) => (
              <button key={it.position} className={[i === idx && 'current', it.rating, it.flagged && 'flagged'].filter(Boolean).join(' ')}
                aria-current={i === idx ? 'step' : undefined}
                aria-label={`${i + 1}${it.rating ? ' · ' + (it.rating === 'recalled' ? t.learn.recalled : t.learn.review) : ''}${it.flagged ? ' · ' + t.exam.flagged : ''}`}
                onClick={() => setIdx(i)}>{i + 1}</button>
            ))}
          </div>
          <div className="legend">
            <span><i className="dot" style={{ background: 'var(--good-line)' }} />{t.learn.recalled}</span>
            <span><i className="dot" style={{ background: 'var(--warn-line)' }} />{t.learn.review}</span>
            <span><i className="dot" style={{ background: 'var(--violet-500)' }} />{t.exam.flagged}</span>
          </div>
          <p className="kbd-hint" style={{ margin: 0 }}>{t.learn.keyboard} · F = {t.exam.flag}</p>
        </section>
      </div>
    </div>
  );
}
