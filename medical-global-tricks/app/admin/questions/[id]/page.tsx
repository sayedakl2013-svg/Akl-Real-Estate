import { notFound } from 'next/navigation';
import Link from 'next/link';
import { adminCtx } from '@/lib/adminPage';
import { one, q } from '@/lib/db';
import { AdminForm, ActionButton } from '@/components/AdminForms';
import { QuestionFields } from '@/components/QuestionFields';

export default async function EditQuestion({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ course?: string }> }) {
  const { L, user, fmt } = await adminCtx();
  const { id } = await params;
  const sp = await searchParams;
  const isNew = id === 'new';
  const question = isNew ? null : await one('SELECT * FROM questions WHERE id = $1', [Number(id) || 0]);
  if (!isNew && !question) notFound();
  const courseId = question?.course_id ?? Number(sp.course);
  const course = await one('SELECT id, title_en FROM courses WHERE id = $1', [courseId]);
  if (!course) notFound();
  const [domains, revisions] = await Promise.all([
    q('SELECT id, name_en FROM domains WHERE course_id = $1 ORDER BY sort_order', [courseId]),
    question ? q(`SELECT r.version, r.created_at, u.name FROM question_revisions r LEFT JOIN users u ON u.id = r.edited_by WHERE r.question_id = $1 ORDER BY r.id DESC LIMIT 10`, [question.id]) : Promise.resolve([]),
  ]);
  const isAdmin = user.role === 'admin';
  const statuses = isAdmin ? ['draft', 'in_review', 'published', 'archived'] : ['draft', 'in_review'];
  return (
    <>
      <div className="crumbs"><Link href={`/admin/questions?course=${courseId}`}>← {course.title_en}</Link></div>
      <div className="spread">
        <h2 style={{ margin: 0 }}>{isNew ? L('New question', 'سؤال جديد') : `#${question.id} · v${question.version}`}</h2>
        {question && <span className="badge badge-violet">{question.status}</span>}
      </div>
      {question && (
        <div className="row">
          {statuses.filter((s) => s !== question.status).map((s) => (
            <ActionButton key={s} action="question.status" payload={{ id: question.id, status: s }} label={`→ ${s}`} className={`btn btn-sm ${s === 'published' ? 'btn-primary' : 'btn-ghost'}`} />
          ))}
        </div>
      )}
      <section className="card">
        <AdminForm redirect={isNew ? '/admin/questions/{id}' : undefined}><QuestionFields q={question} domains={domains} courseId={courseId} L={L} /><div><button className="btn btn-dark">{L('Save', 'حفظ')}</button></div></AdminForm>
      </section>
      {revisions.length > 0 && (
        <section className="card"><h3>{L('Revision history', 'سجل التعديلات')}</h3>
          <ul>{revisions.map((r, i) => <li key={i}>v{r.version} · {fmt(r.created_at)} · {r.name ?? '—'}</li>)}</ul></section>
      )}
    </>
  );
}
