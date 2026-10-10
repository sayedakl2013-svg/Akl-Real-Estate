import { adminCtx } from '@/lib/adminPage';
import { q } from '@/lib/db';

export default async function Audit() {
  const { L, fmt } = await adminCtx('admin');
  const rows = await q(`SELECT a.*, u.email FROM audit_log a LEFT JOIN users u ON u.id = a.actor_id ORDER BY a.id DESC LIMIT 200`);
  return (
    <>
      <h2>{L('Audit log', 'سجل العمليات')}</h2>
      <div className="table-wrap"><table className="table">
        <thead><tr><th>{L('Time', 'الوقت')}</th><th>{L('Actor', 'المنفّذ')}</th><th>{L('Action', 'العملية')}</th><th>{L('Entity', 'العنصر')}</th></tr></thead>
        <tbody>{rows.map((r) => <tr key={r.id}><td>{fmt(r.created_at)}</td><td className="ltr">{r.email ?? 'system'}</td><td>{r.action}</td><td className="ltr">{r.entity} {r.entity_id}</td></tr>)}</tbody>
      </table></div>
    </>
  );
}
