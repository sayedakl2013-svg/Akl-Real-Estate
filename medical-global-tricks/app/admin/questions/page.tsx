import Link from 'next/link';
import { adminCtx } from '@/lib/adminPage';
import { one, q } from '@/lib/db';
import { ActionButton, UploadForm } from '@/components/AdminForms';

const PAGE = 50;

export default async function AdminQuestions({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { L, user } = await adminCtx();
  const sp = await searchParams;
  const courses = await q('SELECT id, title_en FROM courses ORDER BY sort_order, id');
  const courseId = Number(sp.course ?? courses[0]?.id);
  const domains = await q('SELECT id, name_en FROM domains WHERE course_id = $1 ORDER BY sort_order', [courseId]);
  const where = ['qq.course_id = $1']; const params: unknown[] = [courseId];
  if (sp.status) { params.push(sp.status); where.push(`qq.status = $${params.length}`); }
  if (sp.domain) { params.push(Number(sp.domain)); where.push(`qq.domain_id = $${params.length}`); }
  if (sp.q) { params.push(`%${sp.q}%`); where.push(`(qq.prompt ILIKE $${params.length} OR qq.answer ILIKE $${params.length})`); }
  const page = Math.max(0, Number(sp.page ?? 0) || 0);
  const [rows, total, byStatus] = await Promise.all([
    q(`SELECT qq.id, qq.prompt, qq.status, qq.version, qq.updated_at, d.name_en AS domain, d.color, (qq.verification_note IS NOT NULL) AS has_note
         FROM questions qq JOIN domains d ON d.id = qq.domain_id WHERE ${where.join(' AND ')} ORDER BY d.sort_order, qq.id LIMIT ${PAGE} OFFSET ${page * PAGE}`, params),
    one(`SELECT count(*)::int AS n FROM questions qq WHERE ${where.join(' AND ')}`, params),
    q(`SELECT status, count(*)::int AS n FROM questions WHERE course_id = $1 GROUP BY status`, [courseId]),
  ]);
  const qs = (patch: Record<string, string | number>) => '?' + new URLSearchParams({ ...(sp as any), ...Object.fromEntries(Object.entries(patch).map(([k, v]) => [k, String(v)])) }).toString();
  return (
    <>
      <div className="spread"><h2 style={{ margin: 0 }}>{L('Questions & review', 'الأسئلة والمراجعة')}</h2>
        <Link className="btn btn-primary btn-sm" href={`/admin/questions/new?course=${courseId}`}>{L('New question (draft)', 'سؤال جديد (مسودة)')}</Link></div>
      <p className="muted">{L('Workflow: draft → in review → published (admins publish). Editors’ changes to published questions go back to review. Every edit keeps a revision.', 'سير العمل: مسودة ← قيد المراجعة ← منشور (النشر للمشرفين). تعديلات المحررين على الأسئلة المنشورة تعود للمراجعة. كل تعديل يحفظ نسخة سابقة.')}</p>
      {user.role === 'admin' && byStatus.filter((s) => s.status === 'draft' || s.status === 'in_review').map((s) => (
        <ActionButton key={s.status} action="question.bulk_publish" payload={{ course_id: courseId, from: s.status }} className="btn btn-primary btn-sm"
          label={L(`Publish all ${s.n} “${s.status}” questions`, `نشر كل الأسئلة (${s.n}) بحالة «${s.status}»`)}
          confirm={L('Publish them all now? Students with access will see them immediately.', 'نشرها كلها الآن؟ سيراها الطلاب المشتركون فورًا.')} />
      ))}
      <div className="row">{byStatus.map((s) => <Link key={s.status} className="badge badge-draft" href={qs({ status: s.status, page: 0 })}>{s.status}: {s.n}</Link>)}<Link className="badge badge-teal" href={`?course=${courseId}`}>{L('all', 'الكل')}</Link></div>
      <form className="card form-grid" method="get" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', alignItems: 'end' }}>
        <div className="field"><label>{L('Course', 'الكورس')}</label><select name="course" className="input" defaultValue={courseId}>{courses.map((c) => <option key={c.id} value={c.id}>{c.title_en}</option>)}</select></div>
        <div className="field"><label>{L('Domain', 'المجال')}</label><select name="domain" className="input" defaultValue={sp.domain ?? ''}><option value="">—</option>{domains.map((d) => <option key={d.id} value={d.id}>{d.name_en}</option>)}</select></div>
        <div className="field"><label>{L('Status', 'الحالة')}</label><select name="status" className="input" defaultValue={sp.status ?? ''}><option value="">—</option>{['draft', 'in_review', 'published', 'archived'].map((s) => <option key={s}>{s}</option>)}</select></div>
        <div className="field"><label>{L('Search', 'بحث')}</label><input name="q" className="input" defaultValue={sp.q ?? ''} /></div>
        <button className="btn btn-dark">{L('Filter', 'تصفية')}</button>
      </form>
      <p className="faint">{total?.n ?? 0}</p>
      <div className="table-wrap"><table className="table">
        <thead><tr><th>#</th><th>{L('Question', 'السؤال')}</th><th>{L('Domain', 'المجال')}</th><th>{L('Status', 'الحالة')}</th><th>v</th><th /></tr></thead>
        <tbody>{rows.map((r) => (
          <tr key={r.id}><td>{r.id}</td><td dir="ltr" style={{ textAlign: 'left' }}>{r.prompt.slice(0, 140)}{r.has_note && ' ⚠'}</td>
            <td><span className="dot" style={{ background: r.color }} /> {r.domain}</td><td>{r.status}</td><td>{r.version}</td>
            <td><Link href={`/admin/questions/${r.id}`}>{L('Edit', 'تعديل')}</Link></td></tr>
        ))}</tbody>
      </table></div>
      <div className="row">
        {page > 0 && <Link className="btn btn-ghost btn-sm" href={qs({ page: page - 1 })}>←</Link>}
        {(page + 1) * PAGE < (total?.n ?? 0) && <Link className="btn btn-ghost btn-sm" href={qs({ page: page + 1 })}>→</Link>}
      </div>
      {user.role === 'admin' && (
        <details className="card">
          <summary style={{ cursor: 'pointer', fontWeight: 700 }}>{L('Import question bank (study binder HTML)', 'استيراد بنك الأسئلة (ملف الـ Binder بصيغة HTML)')}</summary>
          <UploadForm kind="binder">
            <input type="hidden" name="course_id" value={courseId} />
            <div className="field"><label>{L('File', 'الملف')}</label><input name="file" type="file" accept=".html,text/html" required /></div>
            <div className="field"><label>{L('Import as', 'الاستيراد كـ')}</label><select name="status" className="input"><option value="draft">draft</option><option value="published">published</option></select></div>
            <p className="hint">{L('Re-importing refreshes cards matched by their binder id, but never overwrites questions edited in this panel. Student progress is kept.', 'إعادة الاستيراد تحدّث البطاقات المطابقة، ولا تستبدل الأسئلة المعدّلة من اللوحة. يُحتفظ بتقدّم الطلاب.')}</p>
            <div><button className="btn btn-dark">{L('Import', 'استيراد')}</button></div>
          </UploadForm>
        </details>
      )}
    </>
  );
}
