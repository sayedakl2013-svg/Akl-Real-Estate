'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from './I18n';
import { api, ApiError } from './api';

function useStatus() {
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  return { msg, setMsg };
}

/** Plain HTML form → JSON POST to /api/admin/action. Hidden input "action" names the action. */
export function AdminForm({ children, className = 'stack', resetOnSuccess = false, confirm, redirect }: { children: React.ReactNode; className?: string; resetOnSuccess?: boolean; confirm?: string; redirect?: string }) {
  const router = useRouter();
  const { t } = useI18n();
  const { msg, setMsg } = useStatus();
  const [busy, setBusy] = useState(false);
  return (
    <form className={className} onSubmit={async (e) => {
      e.preventDefault();
      if (confirm && !window.confirm(confirm)) return;
      const form = e.currentTarget;
      const data: Record<string, unknown> = {};
      new FormData(form).forEach((v, k) => { data[k] = v; });
      form.querySelectorAll<HTMLInputElement>('input[type=checkbox]').forEach((c) => { data[c.name] = c.checked; });
      setBusy(true); setMsg(null);
      try {
        const r = await api('/api/admin/action', data);
        if (redirect && r.result?.id) { router.push(redirect.replace('{id}', String(r.result.id))); return; }
        setMsg({ ok: true, text: '✓ ' + t.account.updated });
        if (resetOnSuccess) form.reset();
        router.refresh();
      } catch (x) {
        setMsg({ ok: false, text: (x as ApiError).code ?? t.common.error });
      } finally { setBusy(false); }
    }}>
      <fieldset disabled={busy} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }} className={className}>{children}</fieldset>
      {msg && <div className={`alert ${msg.ok ? 'alert-good' : 'alert-error'}`} role="status">{msg.text}</div>}
    </form>
  );
}

export function ActionButton({ action, payload, label, className = 'btn btn-ghost btn-sm', confirm }: { action: string; payload: Record<string, unknown>; label: string; className?: string; confirm?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  return (
    <span>
      <button type="button" className={className} disabled={busy} onClick={async () => {
        if (confirm && !window.confirm(confirm)) return;
        setBusy(true); setErr('');
        try { await api('/api/admin/action', { action, ...payload }); router.refresh(); }
        catch (x) { setErr((x as ApiError).code); } finally { setBusy(false); }
      }}>{label}</button>
      {err && <span className="faint" role="alert" style={{ color: 'var(--danger)', marginInlineStart: 6 }}>{err}</span>}
    </span>
  );
}

export function UploadForm({ children, kind }: { children: React.ReactNode; kind: 'pdf' | 'pdf_bulk' | 'video' | 'binder' }) {
  const router = useRouter();
  const { t } = useI18n();
  const { msg, setMsg } = useStatus();
  const [busy, setBusy] = useState(false);
  return (
    <form className="stack" onSubmit={async (e) => {
      e.preventDefault();
      const form = e.currentTarget;
      const fd = new FormData(form);
      fd.set('kind', kind);
      setBusy(true); setMsg(null);
      try {
        const res = await fetch('/api/admin/upload', { method: 'POST', body: fd, credentials: 'same-origin' });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error ?? 'upload_failed');
        setMsg({ ok: true, text: '✓ ' + (data.total !== undefined ? `${data.total} · new ${data.inserted} · refreshed ${data.updated} · kept ${data.skipped}` : t.account.updated) });
        form.reset(); router.refresh();
      } catch (x: any) { setMsg({ ok: false, text: x.message }); } finally { setBusy(false); }
    }}>
      <fieldset disabled={busy} className="stack" style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>{children}</fieldset>
      {busy && <p className="faint">{t.common.loading}</p>}
      {msg && <div className={`alert ${msg.ok ? 'alert-good' : 'alert-error'}`} role="status">{msg.text}</div>}
    </form>
  );
}
