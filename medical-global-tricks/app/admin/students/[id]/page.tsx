import { notFound } from 'next/navigation';
import { adminCtx } from '@/lib/adminPage';
import { one, q } from '@/lib/db';
import { AdminForm, ActionButton } from '@/components/AdminForms';

export default async function Student({ params }: { params: Promise<{ id: string }> }) {
  const { L, fmt, user: me } = await adminCtx('admin');
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const u = await one('SELECT * FROM users WHERE id = $1', [id]);
  if (!u) notFound();
  const [enrollments, devices, courses, stats] = await Promise.all([
    q('SELECT e.*, c.title_en FROM enrollments e JOIN courses c ON c.id = e.course_id WHERE e.user_id = $1 ORDER BY e.created_at DESC', [id]),
    q('SELECT * FROM devices WHERE user_id = $1 ORDER BY revoked_at NULLS FIRST, last_seen_at DESC', [id]),
    q(`SELECT id, title_en FROM courses WHERE status = 'available' ORDER BY sort_order`),
    one(`SELECT (SELECT count(*)::int FROM rating_events WHERE user_id = $1) AS ratings, (SELECT count(*)::int FROM exam_attempts WHERE user_id = $1) AS attempts`, [id]),
  ]);
  return (
    <>
      <h2>{u.name} <span className="faint ltr">{u.email}</span></h2>
      <div className="row">
        <span className="badge badge-violet">{u.role}</span>
        {u.email_verified_at ? <span className="badge badge-available">✓ {L('email verified', 'البريد مؤكد')}</span> : <ActionButton action="user.verify" payload={{ id }} label={L('Mark email as verified', 'تأكيد البريد يدويًا')} className="btn btn-good btn-sm" />}
        {u.id !== me.id && <ActionButton action="user.disable" payload={{ id, disabled: !u.disabled_at }} label={u.disabled_at ? L('Enable account', 'تفعيل الحساب') : L('Disable account', 'تعطيل الحساب')} className="btn btn-danger btn-sm" confirm={L('Are you sure?', 'هل أنت متأكد؟')} />}
      </div>
      <p className="faint">{L('Joined', 'التسجيل')}: {fmt(u.created_at)} · {L('Self-ratings', 'تقييمات')}: {stats.ratings} · {L('Attempts', 'محاولات')}: {stats.attempts}</p>

      <section className="card stack">
        <h3 style={{ margin: 0 }}>{L('Course access', 'صلاحيات الكورسات')}</h3>
        <div className="table-wrap"><table className="table"><tbody>{enrollments.map((e) => (
          <tr key={e.id}><td>{e.title_en}</td><td>{e.source}</td><td>{e.status}</td><td>{e.expires_at ? fmt(e.expires_at) : '∞'}</td><td>{e.note}</td>
            <td>{['active', 'canceled', 'past_due'].includes(e.status) && <ActionButton action="enrollment.revoke" payload={{ id: e.id }} label={L('Revoke', 'سحب')} className="btn btn-danger btn-sm" confirm={L('Revoke this access?', 'سحب هذه الصلاحية؟')} />}</td></tr>
        ))}</tbody></table></div>
        <AdminForm resetOnSuccess className="form-grid two">
          <input type="hidden" name="action" value="enrollment.grant" /><input type="hidden" name="user_id" value={id} />
          <div className="field"><label>{L('Course', 'الكورس')}</label><select name="course_id" className="input">{courses.map((c) => <option key={c.id} value={c.id}>{c.title_en}</option>)}</select></div>
          <div className="field"><label>{L('Days (empty = no expiry)', 'الأيام (فارغ = بلا انتهاء)')}</label><input name="days" type="number" min="1" className="input" /></div>
          <div className="field"><label>{L('Note (e.g. trial, comp, offline payment ref)', 'ملاحظة')}</label><input name="note" className="input" /></div>
          <div><button className="btn btn-dark">{L('Grant access', 'منح الوصول')}</button></div>
        </AdminForm>
      </section>

      <section className="card stack">
        <h3 style={{ margin: 0 }}>{L('Devices', 'الأجهزة')}</h3>
        <ul style={{ margin: 0 }}>{devices.map((d) => (
          <li key={d.id}>{d.label} · {fmt(d.last_seen_at)} {d.revoked_at ? <span className="badge badge-draft">revoked</span> : <ActionButton action="device.revoke" payload={{ id: d.id }} label={L('Revoke', 'إلغاء')} confirm={L('Sign this device out and free its slot?', 'تسجيل خروج هذا الجهاز وتحرير مكانه؟')} />}</li>
        ))}</ul>
      </section>

      {u.id !== me.id && (
        <section className="card">
          <AdminForm className="row">
            <input type="hidden" name="action" value="user.role" /><input type="hidden" name="id" value={id} />
            <label htmlFor="role" className="label">{L('Role', 'الدور')}</label>
            <select id="role" name="role" className="input" style={{ maxWidth: 200 }} defaultValue={u.role}><option>student</option><option>editor</option><option>admin</option></select>
            <button className="btn btn-ghost btn-sm">{L('Change role', 'تغيير الدور')}</button>
          </AdminForm>
        </section>
      )}
    </>
  );
}
