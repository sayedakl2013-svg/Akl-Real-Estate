'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from './api';

export function SetupForm({ lang }: { lang: 'en' | 'ar' }) {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [err, setErr] = useState('');
  const L = (en: string, ar: string) => (lang === 'ar' ? ar : en);
  return (
    <form className="stack" onSubmit={async (e) => {
      e.preventDefault(); setErr('');
      try { await api('/api/setup', { token }); router.push('/admin'); router.refresh(); }
      catch (x) { const c = (x as ApiError).code; setErr(c === 'invalid_token' ? L('Wrong token.', 'الرمز غير صحيح.') : c === 'admin_exists' ? L('An admin already exists.', 'يوجد مشرف بالفعل.') : c); }
    }}>
      <div className="field">
        <label htmlFor="tok">ADMIN_BOOTSTRAP_TOKEN</label>
        <input id="tok" className="input ltr" required autoComplete="off" value={token} onChange={(e) => setToken(e.target.value)} />
      </div>
      {err && <div className="alert alert-error" role="alert">{err}</div>}
      <button className="btn btn-primary">{L('Make my account the admin', 'اجعل حسابي هو المشرف')}</button>
    </form>
  );
}
