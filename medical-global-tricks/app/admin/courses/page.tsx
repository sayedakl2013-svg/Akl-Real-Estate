import Link from 'next/link';
import { adminCtx } from '@/lib/adminPage';
import { listCourses } from '@/lib/catalog';
import { AdminForm } from '@/components/AdminForms';
import { CourseFields } from '@/components/CourseFields';

export default async function AdminCourses() {
  const { L, user } = await adminCtx();
  const courses = await listCourses({}, true);
  return (
    <>
      <h2>{L('Courses', 'الكورسات')} <span className="faint">({courses.length})</span></h2>
      <p className="muted">{L('Each course has its own domains, questions, files, offers and student access. The catalogue is designed for around 100 independent courses.', 'لكل كورس مجالاته وأسئلته وملفاته وعروضه وصلاحيات طلابه. صُمّم الكتالوج لنحو 100 كورس مستقل.')}</p>
      <div className="table-wrap"><table className="table">
        <thead><tr><th>{L('Course', 'الكورس')}</th><th>{L('Country', 'البلد')}</th><th>{L('Authority', 'الجهة')}</th><th>{L('Track', 'المسار')}</th><th>{L('Status', 'الحالة')}</th><th>Q</th><th /></tr></thead>
        <tbody>{courses.map((c) => (
          <tr key={c.id}><td>{c.title_en}<div className="faint">{c.title_ar}</div></td><td>{c.country}</td><td>{c.authority}</td><td>{c.track}</td>
            <td><span className={`badge badge-${c.status === 'available' ? 'available' : c.status === 'planned' ? 'planned' : 'draft'}`}>{c.status}</span></td>
            <td>{c.question_count}</td><td><Link href={`/admin/courses/${c.id}`}>{L('Manage', 'إدارة')}</Link></td></tr>
        ))}</tbody>
      </table></div>
      {user.role === 'admin' && (
        <details className="card">
          <summary style={{ cursor: 'pointer', fontWeight: 700 }}>{L('Add a course', 'إضافة كورس')}</summary>
          <AdminForm resetOnSuccess><CourseFields L={L} /><div><button className="btn btn-primary">{L('Create course', 'إنشاء الكورس')}</button></div></AdminForm>
        </details>
      )}
    </>
  );
}
