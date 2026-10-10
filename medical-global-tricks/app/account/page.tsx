import { pageUser } from '@/lib/auth';
import { getT, pick } from '@/lib/i18n';
import { q } from '@/lib/db';
import { formatMoney, paymentsEnabled } from '@/lib/catalog';
import { emailConfigured } from '@/lib/email';
import { PasswordChange, PortalButton } from '@/components/PasswordChange';
import { ResendVerification } from '@/components/AuthForms';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Account' };

export default async function Account() {
  const user = await pageUser('/account');
  const { t, lang } = await getT();
  const [devices, enrollments, orders, requests] = await Promise.all([
    q(`SELECT id, label, first_seen_at, last_seen_at FROM devices WHERE user_id = $1 AND revoked_at IS NULL ORDER BY last_seen_at DESC`, [user.id]),
    q(`SELECT e.*, c.title_en, c.title_ar FROM enrollments e JOIN courses c ON c.id = e.course_id WHERE e.user_id = $1 ORDER BY e.created_at DESC`, [user.id]),
    q(`SELECT o.*, c.title_en, c.title_ar FROM orders o JOIN courses c ON c.id = o.course_id WHERE o.user_id = $1 ORDER BY o.created_at DESC LIMIT 20`, [user.id]),
    q(`SELECT r.status, r.new_device_label, r.created_at, r.admin_note FROM device_replacement_requests r WHERE r.user_id = $1 ORDER BY r.created_at DESC LIMIT 5`, [user.id]),
  ]);
  const df = new Intl.DateTimeFormat(lang === 'ar' ? 'ar-AE' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' });
  const hasSub = enrollments.some((e) => e.source === 'subscription');
  return (
    <>
      <div className="page-head"><div className="container"><h1>{t.account.title}</h1><p className="ltr" style={{ display: 'inline' }}>{user.email}</p></div></div>
      <div className="container section stack" style={{ paddingTop: 28, maxWidth: 900 }}>
        <section className="card stack">
          <h2 style={{ fontSize: '1.2rem', margin: 0 }}>{t.account.profile}</h2>
          <div className="spread"><span><b>{user.name}</b> · <span className="ltr">{user.email}</span></span>
            {user.emailVerified ? <span className="badge badge-available">✓ {t.auth.email}</span> : <span className="badge badge-warn">{t.auth.notVerified}</span>}
          </div>
          {!user.emailVerified && (emailConfigured() ? <ResendVerification /> : <p className="faint" style={{ margin: 0 }}>{t.auth.emailOff}</p>)}
        </section>

        <section className="card stack">
          <h2 style={{ fontSize: '1.2rem', margin: 0 }}>{t.account.subscriptions}</h2>
          {enrollments.length === 0 ? <p className="muted" style={{ margin: 0 }}>{t.account.none}</p> : (
            <div className="table-wrap"><table className="table">
              <tbody>{enrollments.map((e) => (
                <tr key={e.id}>
                  <td>{pick(lang, e.title_en, e.title_ar)}</td>
                  <td>{e.source === 'subscription' ? t.course.subscription : e.source === 'one_time' ? t.course.oneTime : t.nav.admin}</td>
                  <td><span className={`badge ${e.status === 'active' ? 'badge-available' : 'badge-draft'}`}>{e.status}</span></td>
                  <td>{e.expires_at ? `${t.course.expires}: ${df.format(new Date(e.expires_at))}` : t.course.noExpiry}</td>
                </tr>
              ))}</tbody>
            </table></div>
          )}
          {hasSub && paymentsEnabled() && <div><PortalButton /></div>}
        </section>

        {orders.length > 0 && (
          <section className="card stack">
            <h2 style={{ fontSize: '1.2rem', margin: 0 }}>{t.account.orders}</h2>
            <div className="table-wrap"><table className="table"><tbody>{orders.map((o) => (
              <tr key={o.id}><td>{df.format(new Date(o.created_at))}</td><td>{pick(lang, o.title_en, o.title_ar)}</td><td className="ltr">{formatMoney(o.amount_minor, o.currency, lang)}</td><td>{o.status}</td></tr>
            ))}</tbody></table></div>
          </section>
        )}

        <section className="card stack">
          <h2 style={{ fontSize: '1.2rem', margin: 0 }}>{t.account.devices} <span className="faint ltr">({devices.length}/2)</span></h2>
          <p className="muted" style={{ margin: 0 }}>{t.account.deviceRule}</p>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {devices.map((d) => (
              <li key={d.id} className="spread" style={{ padding: '10px 0', borderBottom: '1px solid var(--line)' }}>
                <span><b>{d.label}</b> {d.id === user.deviceId && <span className="badge badge-teal">{t.account.thisDevice}</span>}</span>
                <span className="faint">{t.account.lastSeen}: {df.format(new Date(d.last_seen_at))}</span>
              </li>
            ))}
          </ul>
          {requests.length > 0 && (
            <>
              <h3 style={{ margin: 0 }}>{t.account.requests}</h3>
              <ul style={{ margin: 0 }}>{requests.map((r, i) => <li key={i}>{df.format(new Date(r.created_at))} — {r.new_device_label} — <b>{r.status}</b>{r.admin_note ? ` (${r.admin_note})` : ''}</li>)}</ul>
            </>
          )}
        </section>

        <section className="card stack">
          <h2 style={{ fontSize: '1.2rem', margin: 0 }}>{t.account.changePw}</h2>
          <PasswordChange />
        </section>
      </div>
    </>
  );
}
