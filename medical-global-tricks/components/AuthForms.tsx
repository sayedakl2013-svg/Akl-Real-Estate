'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useI18n } from './I18n';
import { api, ApiError } from './api';
import { play } from '@/lib/sound';

function useErr() {
  const { t } = useI18n();
  const [err, setErr] = useState('');
  const show = (e: unknown) => setErr(t.auth.errors[(e as ApiError)?.code] ?? t.auth.errors.unknown);
  return { err, setErr, show };
}

const safeNext = (n: string | null) => (n && n.startsWith('/') && !n.startsWith('//') ? n : '/dashboard');

export function LoginForm({ next }: { next: string | null }) {
  const { t } = useI18n();
  const router = useRouter();
  const { err, setErr, show } = useErr();
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [devices, setDevices] = useState<{ id: string; label: string; last_seen_at: string }[] | null>(null);
  const [replaceId, setReplaceId] = useState('');
  const [reason, setReason] = useState('');
  const [sent, setSent] = useState(false);

  if (sent) return <div className="alert alert-good" role="status">{t.auth.requestSent}</div>;

  if (devices) {
    return (
      <form className="stack" onSubmit={async (e) => {
        e.preventDefault(); setBusy(true); setErr('');
        try { await api('/api/auth/device-request', { email, password, replaceDeviceId: replaceId, reason }); setSent(true); }
        catch (x) { show(x); } finally { setBusy(false); }
      }}>
        <div className="alert alert-warn"><b>{t.auth.deviceLimitTitle}</b><br />{t.auth.deviceLimit}</div>
        <fieldset className="stack" style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="label">{t.auth.replace}</legend>
          {devices.map((d) => (
            <label key={d.id} className="check card" style={{ padding: 12 }}>
              <input type="radio" name="replace" value={d.id} required checked={replaceId === d.id} onChange={() => setReplaceId(d.id)} />
              <span>{d.label} <span className="faint">· {t.account.lastSeen}: {new Date(d.last_seen_at).toLocaleDateString()}</span></span>
            </label>
          ))}
        </fieldset>
        <div className="field">
          <label htmlFor="reason">{t.auth.reason}</label>
          <textarea id="reason" className="input" maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
        {err && <div className="alert alert-error" role="alert">{err}</div>}
        <button className="btn btn-primary" disabled={busy || !replaceId}>{t.auth.requestReplace}</button>
      </form>
    );
  }

  return (
    <form className="stack" onSubmit={async (e) => {
      e.preventDefault(); setBusy(true); setErr('');
      try {
        await api('/api/auth/login', { email, password });
        play('start');
        router.push(safeNext(next)); router.refresh();
      } catch (x) {
        if (x instanceof ApiError && x.code === 'device_limit') setDevices(x.data.devices);
        else show(x);
        setBusy(false);
      }
    }}>
      <div className="field">
        <label htmlFor="email">{t.auth.email}</label>
        <input id="email" className="input ltr" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="password">{t.auth.password}</label>
        <input id="password" className="input ltr" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      {err && <div className="alert alert-error" role="alert">{err}</div>}
      <button className="btn btn-primary btn-block" disabled={busy}>{busy ? t.common.loading : t.auth.signIn}</button>
      <div className="spread faint">
        <Link href="/forgot-password">{t.auth.forgot}</Link>
        <span>{t.auth.noAccount} <Link href="/register">{t.auth.signUp}</Link></span>
      </div>
    </form>
  );
}

export function RegisterForm() {
  const { t, lang } = useI18n();
  const router = useRouter();
  const { err, setErr, show } = useErr();
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({ name: '', email: '', password: '', confirm: '' });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  return (
    <form className="stack" onSubmit={async (e) => {
      e.preventDefault(); setErr('');
      if (f.password !== f.confirm) return setErr(t.auth.errors.mismatch);
      setBusy(true);
      try {
        await api('/api/auth/register', { name: f.name, email: f.email, password: f.password, lang });
        play('start');
        router.push('/dashboard?welcome=1'); router.refresh();
      } catch (x) { show(x); setBusy(false); }
    }}>
      <div className="field"><label htmlFor="name">{t.auth.name}</label><input id="name" className="input" autoComplete="name" required maxLength={120} value={f.name} onChange={set('name')} /></div>
      <div className="field"><label htmlFor="email">{t.auth.email}</label><input id="email" className="input ltr" type="email" autoComplete="email" required value={f.email} onChange={set('email')} /></div>
      <div className="form-grid two">
        <div className="field"><label htmlFor="password">{t.auth.password}</label><input id="password" className="input ltr" type="password" autoComplete="new-password" required minLength={10} value={f.password} onChange={set('password')} aria-describedby="pw-rules" /></div>
        <div className="field"><label htmlFor="confirm">{t.auth.confirm}</label><input id="confirm" className="input ltr" type="password" autoComplete="new-password" required value={f.confirm} onChange={set('confirm')} /></div>
      </div>
      <p id="pw-rules" className="hint" style={{ margin: 0 }}>{t.auth.pwRules}</p>
      {err && <div className="alert alert-error" role="alert">{err}</div>}
      <button className="btn btn-primary btn-block" disabled={busy}>{busy ? t.common.loading : t.auth.signUp}</button>
      <p className="faint" style={{ margin: 0 }}>
        {t.auth.haveAccount} <Link href="/login">{t.auth.signIn}</Link> · <Link href="/legal/terms">{t.footer.terms}</Link> · <Link href="/legal/privacy">{t.footer.privacy}</Link>
      </p>
    </form>
  );
}

export function ForgotForm() {
  const { t } = useI18n();
  const { err, setErr, show } = useErr();
  const [email, setEmail] = useState('');
  const [done, setDone] = useState(false);
  if (done) return <div className="alert alert-good" role="status">{t.auth.resetSent}</div>;
  return (
    <form className="stack" onSubmit={async (e) => {
      e.preventDefault(); setErr('');
      try { await api('/api/auth/forgot', { email }); setDone(true); } catch (x) { show(x); }
    }}>
      <div className="field"><label htmlFor="email">{t.auth.email}</label><input id="email" className="input ltr" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
      {err && <div className="alert alert-error" role="alert">{err}</div>}
      <button className="btn btn-primary btn-block">{t.auth.sendReset}</button>
    </form>
  );
}

export function ResetForm({ token }: { token: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const { err, setErr, show } = useErr();
  const [pw, setPw] = useState('');
  const [confirm, setConfirm] = useState('');
  return (
    <form className="stack" onSubmit={async (e) => {
      e.preventDefault(); setErr('');
      if (pw !== confirm) return setErr(t.auth.errors.mismatch);
      try { await api('/api/auth/reset', { token, password: pw }); router.push('/login'); } catch (x) { show(x); }
    }}>
      <div className="field"><label htmlFor="pw">{t.auth.newPassword}</label><input id="pw" className="input ltr" type="password" autoComplete="new-password" required value={pw} onChange={(e) => setPw(e.target.value)} /></div>
      <div className="field"><label htmlFor="pw2">{t.auth.confirm}</label><input id="pw2" className="input ltr" type="password" autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} /></div>
      <p className="hint" style={{ margin: 0 }}>{t.auth.pwRules}</p>
      {err && <div className="alert alert-error" role="alert">{err}</div>}
      <button className="btn btn-primary btn-block">{t.auth.setPassword}</button>
    </form>
  );
}

export function VerifyRunner({ token }: { token: string }) {
  const { t } = useI18n();
  const [state, setState] = useState<'idle' | 'ok' | 'fail'>('idle');
  if (state === 'ok') return <div className="alert alert-good" role="status">{t.auth.verified} <Link href="/dashboard">{t.nav.dashboard}</Link></div>;
  if (state === 'fail') return <div className="alert alert-error" role="alert">{t.auth.verifyFailed}</div>;
  // Confirmation needs a click: mail scanners that prefetch links must not consume the token.
  return (
    <button className="btn btn-primary" onClick={async () => {
      try { await api('/api/auth/verify', { token }); setState('ok'); play('save'); } catch { setState('fail'); }
    }}>{t.auth.verifyTitle}</button>
  );
}

export function ResendVerification() {
  const { t } = useI18n();
  const [msg, setMsg] = useState('');
  return (
    <span>
      <button className="btn btn-ghost btn-sm" onClick={async () => {
        try { const r = await api('/api/auth/resend', {}); setMsg(r.emailSent ? '✓' : t.auth.emailOff); }
        catch (x: any) { setMsg(t.auth.errors[x.code] ?? t.common.error); }
      }}>{t.auth.resend}</button>
      {msg && <span className="faint" role="status" style={{ marginInlineStart: 8 }}>{msg}</span>}
    </span>
  );
}
