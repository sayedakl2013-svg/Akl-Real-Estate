import Link from 'next/link';
import { adminCtx } from '@/lib/adminPage';
import { one, q } from '@/lib/db';

export default async function Students({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const { L, fmt } = await adminCtx('admin');
  const sp = await searchParams;
  const page = Math.max(0, Number(sp.page ?? 0) || 0);
  const params: unknown[] = [];
  let where = 'true';
  if (sp.q) { params.push(`%${sp.q}%`); where = `(u.email ILIKE $1 OR u.name ILIKE $1)`; }
  const [rows, total] = await Promise.all([
    q(`SELECT u.id, u.name, u.email, u.role, u.created_at, u.email_verified_at, u.disabled_at,
              (SELECT count(*)::int FROM enrollments e WHERE e.user_id = u.id AND e.status IN ('active','canceled') AND (e.expires_at IS NULL OR e.expires_at > now())) AS access,
              (SELECT count(*)::int FROM devices d WHERE d.user_id = u.id AND d.revoked_at IS NULL) AS devices
         FROM users u WHERE ${where} ORDER BY u.created_at DESC LIMIT 50 OFFSET ${page * 50}`, params),
    one(`SELECT count(*)::int AS n FROM users u WHERE ${where}`, params),
  ]);
  return (
    <>
      <h2>{L('Students & access', 'الطلاب والصلاحيات')} <span className="faint">({total?.n})</span></h2>
      <form className="row" method="get"><input name="q" className="input" style={{ maxWidth: 320 }} defaultValue={sp.q ?? ''} placeholder={L('Name or email', 'الاسم أو البريد')} /><button className="btn btn-dark btn-sm">{L('Search', 'بحث')}</button></form>
      <div className="table-wrap"><table className="table">
        <thead><tr><th>{L('Name', 'الاسم')}</th><th>Email</th><th>{L('Role', 'الدور')}</th><th>{L('Verified', 'مؤكد')}</th><th>{L('Access', 'وصول')}</th><th>{L('Devices', 'أجهزة')}</th><th>{L('Joined', 'التسجيل')}</th><th /></tr></thead>
        <tbody>{rows.map((u) => (
          <tr key={u.id}><td>{u.name}{u.disabled_at && <span className="badge badge-warn">disabled</span>}</td><td className="ltr">{u.email}</td><td>{u.role}</td><td>{u.email_verified_at ? '✓' : '—'}</td><td>{u.access}</td><td>{u.devices}/2</td><td>{fmt(u.created_at)}</td>
            <td><Link href={`/admin/students/${u.id}`}>{L('Manage', 'إدارة')}</Link></td></tr>
        ))}</tbody>
      </table></div>
      <div className="row">{page > 0 && <Link className="btn btn-ghost btn-sm" href={`?q=${sp.q ?? ''}&page=${page - 1}`}>←</Link>}{(page + 1) * 50 < (total?.n ?? 0) && <Link className="btn btn-ghost btn-sm" href={`?q=${sp.q ?? ''}&page=${page + 1}`}>→</Link>}</div>
    </>
  );
}
