import Link from 'next/link';
import { adminCtx } from '@/lib/adminPage';
import { q } from '@/lib/db';
import { ActionButton } from '@/components/AdminForms';

export default async function DeviceRequests() {
  const { L, fmt } = await adminCtx('admin');
  const rows = await q(`SELECT r.*, u.name, u.email, d.label AS old_label, d.last_seen_at AS old_seen
    FROM device_replacement_requests r JOIN users u ON u.id = r.user_id LEFT JOIN devices d ON d.id = r.replace_device_id
    ORDER BY (r.status = 'pending') DESC, r.created_at DESC LIMIT 100`);
  return (
    <>
      <h2>{L('Device replacement requests', 'طلبات استبدال الأجهزة')}</h2>
      <p className="muted">{L('Approving revokes the old device (signing it out) and registers the new one. The student then signs in on the new device.', 'الموافقة تلغي الجهاز القديم (وتسجّل خروجه) وتسجّل الجهاز الجديد، ثم يسجّل الطالب الدخول من الجهاز الجديد.')}</p>
      {rows.length === 0 ? <p className="muted">—</p> : (
        <div className="table-wrap"><table className="table">
          <thead><tr><th>{L('Student', 'الطالب')}</th><th>{L('Replace', 'استبدال')}</th><th>{L('New device', 'الجهاز الجديد')}</th><th>{L('Reason', 'السبب')}</th><th>{L('Requested', 'تاريخ الطلب')}</th><th>{L('Status', 'الحالة')}</th><th /></tr></thead>
          <tbody>{rows.map((r) => (
            <tr key={r.id}>
              <td><Link href={`/admin/students/${r.user_id}`}>{r.name}</Link><div className="faint ltr">{r.email}</div></td>
              <td>{r.old_label ?? '—'}<div className="faint">{fmt(r.old_seen)}</div></td><td>{r.new_device_label}</td><td dir="auto">{r.reason}</td><td>{fmt(r.created_at)}</td><td>{r.status}</td>
              <td>{r.status === 'pending' && <span className="row" style={{ flexWrap: 'nowrap' }}>
                <ActionButton action="devicereq.decide" payload={{ id: r.id, approve: true }} label={L('Approve', 'موافقة')} className="btn btn-good btn-sm" />
                <ActionButton action="devicereq.decide" payload={{ id: r.id, approve: false }} label={L('Reject', 'رفض')} className="btn btn-danger btn-sm" />
              </span>}</td>
            </tr>
          ))}</tbody>
        </table></div>
      )}
    </>
  );
}
