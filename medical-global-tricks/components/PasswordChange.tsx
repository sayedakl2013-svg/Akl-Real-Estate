'use client';
import { useState } from 'react';
import { useI18n } from './I18n';
import { api, ApiError } from './api';

export function PasswordChange() {
  const { t } = useI18n();
  const [f, setF] = useState({ current: '', password: '', confirm: '' });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  return (
    <form className="stack" onSubmit={async (e) => {
      e.preventDefault(); setMsg(null);
      if (f.password !== f.confirm) return setMsg({ ok: false, text: t.auth.errors.mismatch });
      try { await api('/api/account/password', { current: f.current, password: f.password }); setMsg({ ok: true, text: t.account.updated }); setF({ current: '', password: '', confirm: '' }); }
      catch (x) { setMsg({ ok: false, text: t.auth.errors[(x as ApiError).code] ?? t.common.error }); }
    }}>
      <div className="field"><label htmlFor="cur">{t.account.current}</label><input id="cur" type="password" className="input ltr" autoComplete="current-password" required value={f.current} onChange={(e) => setF({ ...f, current: e.target.value })} /></div>
      <div className="form-grid two">
        <div className="field"><label htmlFor="np">{t.auth.newPassword}</label><input id="np" type="password" className="input ltr" autoComplete="new-password" required value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></div>
        <div className="field"><label htmlFor="np2">{t.auth.confirm}</label><input id="np2" type="password" className="input ltr" autoComplete="new-password" required value={f.confirm} onChange={(e) => setF({ ...f, confirm: e.target.value })} /></div>
      </div>
      <p className="hint" style={{ margin: 0 }}>{t.auth.pwRules}</p>
      {msg && <div className={`alert ${msg.ok ? 'alert-good' : 'alert-error'}`} role="status">{msg.text}</div>}
      <div><button className="btn btn-dark">{t.account.changePw}</button></div>
    </form>
  );
}

export function PortalButton() {
  const { t } = useI18n();
  return <button className="btn btn-ghost btn-sm" onClick={async () => { try { const r = await api('/api/billing/portal', {}); window.location.href = r.url; } catch {} }}>{t.account.manage}</button>;
}
