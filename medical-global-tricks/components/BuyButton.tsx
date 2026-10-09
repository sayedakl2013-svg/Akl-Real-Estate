'use client';
import { useState } from 'react';
import { useI18n } from './I18n';
import { api } from './api';
import { play } from '@/lib/sound';

export function BuyButton({ offerId }: { offerId: number }) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  return (
    <div className="stack">
      <button className="btn btn-primary btn-sm" disabled={busy} onClick={async () => {
        setBusy(true); setErr(''); play('tap');
        try {
          const r = await api<{ url: string }>('/api/checkout', { offerId });
          window.location.href = r.url;
        } catch (e: any) {
          setErr(t.auth.errors[e.code] ?? t.common.error); setBusy(false);
        }
      }}>{busy ? t.course.redirecting : t.course.buy}</button>
      {err && <div className="alert alert-error" role="alert">{err}</div>}
    </div>
  );
}
