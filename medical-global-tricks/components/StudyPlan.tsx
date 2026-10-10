'use client';
import { useState } from 'react';
import { useI18n } from './I18n';
import { api } from './api';
import { play } from '@/lib/sound';

interface Item { id: number; week: number; title_en: string; title_ar: string; done: boolean }

export function StudyPlan({ courseId, items: initial }: { courseId: number; items: Item[] }) {
  const { t, lang } = useI18n();
  const [items, setItems] = useState(initial);
  const weeks = [...new Set(items.map((i) => i.week))].sort((a, b) => a - b);
  const done = items.filter((i) => i.done).length;
  const toggle = async (it: Item) => {
    const next = !it.done;
    setItems((xs) => xs.map((x) => (x.id === it.id ? { ...x, done: next } : x)));
    try { await api(`/api/courses/${courseId}/plan`, { itemId: it.id, done: next }); if (next) play('save'); }
    catch { setItems((xs) => xs.map((x) => (x.id === it.id ? { ...x, done: it.done } : x))); }
  };
  return (
    <div className="stack">
      <div className="card stack">
        <div className="spread"><span>{t.plan.intro}</span><b className="ltr">{done}/{items.length}</b></div>
        <div className="progress"><i style={{ width: `${items.length ? (done / items.length) * 100 : 0}%`, animation: 'none', transition: 'width .4s var(--ease)' }} /></div>
      </div>
      {weeks.map((w) => (
        <section key={w} className="card plan-week">
          <h3>{t.plan.week} {w}</h3>
          {items.filter((i) => i.week === w).map((it) => (
            <div key={it.id} className={`plan-item ${it.done ? 'done' : ''}`}>
              <label className="check">
                <input type="checkbox" checked={it.done} onChange={() => toggle(it)} />
                <span>{lang === 'ar' ? it.title_ar : it.title_en}</span>
              </label>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
