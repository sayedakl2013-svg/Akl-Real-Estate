import { notFound } from 'next/navigation';
import Link from 'next/link';
import { adminCtx } from '@/lib/adminPage';
import { one, q } from '@/lib/db';
import { formatMoney } from '@/lib/catalog';
import { AdminForm, ActionButton } from '@/components/AdminForms';
import { CourseFields } from '@/components/CourseFields';

export default async function AdminCourse({ params }: { params: Promise<{ id: string }> }) {
  const { L, lang, user } = await adminCtx();
  const id = Number((await params).id);
  const course = Number.isInteger(id) ? await one('SELECT * FROM courses WHERE id = $1', [id]) : null;
  if (!course) notFound();
  const [domains, offers, plan] = await Promise.all([
    q(`SELECT d.*, (SELECT count(*)::int FROM questions x WHERE x.domain_id = d.id) AS n FROM domains d WHERE course_id = $1 ORDER BY sort_order, id`, [id]),
    q('SELECT * FROM course_offers WHERE course_id = $1 ORDER BY id', [id]),
    q('SELECT * FROM study_plan_items WHERE course_id = $1 ORDER BY week, sort_order, id', [id]),
  ]);
  const isAdmin = user.role === 'admin';
  return (
    <>
      <div className="spread"><h2 style={{ margin: 0 }}>{course.title_en}</h2>
        <div className="row"><Link className="btn btn-ghost btn-sm" href={`/admin/questions?course=${id}`}>{L('Questions', 'الأسئلة')}</Link><Link className="btn btn-ghost btn-sm" href={`/courses/${course.slug}`}>{L('View', 'عرض')}</Link></div></div>
      {isAdmin && <section className="card"><AdminForm><CourseFields c={course} L={L} /><div><button className="btn btn-primary">{L('Save', 'حفظ')}</button></div></AdminForm></section>}

      <section className="card stack">
        <h3 style={{ margin: 0 }}>{L('Domains', 'المجالات')}</h3>
        <div className="table-wrap"><table className="table">
          <thead><tr><th>Code</th><th>EN</th><th>AR</th><th>Q</th><th>{L('Colour', 'اللون')}</th></tr></thead>
          <tbody>{domains.map((d) => <tr key={d.id}><td>{d.code}</td><td>{d.name_en}</td><td>{d.name_ar}</td><td>{d.n}</td><td><span className="dot" style={{ background: d.color }} /> {d.color}</td></tr>)}</tbody>
        </table></div>
        {isAdmin && (
          <details><summary style={{ cursor: 'pointer', fontWeight: 700 }}>{L('Add domain', 'إضافة مجال')}</summary>
            <AdminForm resetOnSuccess className="form-grid two">
              <input type="hidden" name="action" value="domain.save" /><input type="hidden" name="course_id" value={id} />
              <div className="field"><label>Code</label><input name="code" className="input" required maxLength={10} /></div>
              <div className="field"><label>{L('Colour', 'اللون')}</label><input name="color" className="input" type="color" defaultValue="#14B8A6" /></div>
              <div className="field"><label>Name (EN)</label><input name="name_en" className="input" required /></div>
              <div className="field"><label>الاسم (AR)</label><input name="name_ar" className="input" required dir="rtl" /></div>
              <div className="field"><label>Scope (EN)</label><input name="description_en" className="input" /></div>
              <div className="field"><label>{L('Sort order', 'الترتيب')}</label><input name="sort_order" className="input" type="number" defaultValue={domains.length} /></div>
              <div><button className="btn btn-dark">{L('Add', 'إضافة')}</button></div>
            </AdminForm>
          </details>
        )}
      </section>

      <section className="card stack">
        <h3 style={{ margin: 0 }}>{L('Offers & pricing', 'العروض والأسعار')}</h3>
        <p className="hint" style={{ margin: 0 }}>{L('Nothing is sold until an offer exists, the course is “available” and Stripe is configured. Enter real prices only.', 'لا يُباع شيء قبل وجود عرض، وأن يكون الكورس «متاحًا»، وإعداد Stripe. أدخل أسعارًا حقيقية فقط.')}</p>
        {offers.length > 0 && (
          <div className="table-wrap"><table className="table"><tbody>{offers.map((o) => (
            <tr key={o.id}><td>{o.label_en}</td><td>{o.kind}</td><td className="ltr">{formatMoney(o.amount_minor, o.currency, lang)}</td>
              <td>{o.kind === 'subscription' ? `${o.interval_count} ${o.interval}` : o.access_days ? `${o.access_days} d` : '∞'}</td>
              <td>{o.active ? '✓' : '—'}</td>
              <td>{isAdmin && <ActionButton action="offer.toggle" payload={{ id: o.id, active: !o.active }} label={o.active ? L('Deactivate', 'إيقاف') : L('Activate', 'تفعيل')} />}</td></tr>
          ))}</tbody></table></div>
        )}
        {isAdmin && (
          <details><summary style={{ cursor: 'pointer', fontWeight: 700 }}>{L('Add offer', 'إضافة عرض')}</summary>
            <AdminForm resetOnSuccess className="form-grid two">
              <input type="hidden" name="action" value="offer.save" /><input type="hidden" name="course_id" value={id} />
              <div className="field"><label>{L('Type', 'النوع')}</label><select name="kind" className="input"><option value="one_time">one_time</option><option value="subscription">subscription</option></select></div>
              <div className="field"><label>{L('Currency (ISO, e.g. aed, usd)', 'العملة')}</label><input name="currency" className="input" required maxLength={3} dir="ltr" /></div>
              <div className="field"><label>Label (EN)</label><input name="label_en" className="input" required /></div>
              <div className="field"><label>الاسم (AR)</label><input name="label_ar" className="input" required dir="rtl" /></div>
              <div className="field"><label>{L('Price (major units, e.g. 499.00)', 'السعر')}</label><input name="amount" className="input" type="number" step="0.01" min="0.5" required /></div>
              <div className="field"><label>{L('One-time: access days (empty = no expiry)', 'لمرة واحدة: أيام الوصول')}</label><input name="access_days" className="input" type="number" min="1" /></div>
              <div className="field"><label>{L('Subscription interval', 'فترة الاشتراك')}</label><select name="interval" className="input"><option value="month">month</option><option value="year">year</option></select></div>
              <div className="field"><label>{L('Interval count', 'عدد الفترات')}</label><input name="interval_count" className="input" type="number" min="1" defaultValue={1} /></div>
              <div><button className="btn btn-dark">{L('Add offer', 'إضافة العرض')}</button></div>
            </AdminForm>
          </details>
        )}
      </section>

      <section className="card stack">
        <h3 style={{ margin: 0 }}>{L('Study plan template', 'قالب خطة المذاكرة')} <span className="faint">({plan.length})</span></h3>
        <details><summary style={{ cursor: 'pointer' }}>{L('Show items', 'عرض البنود')}</summary>
          <ul>{plan.map((p) => <li key={p.id}>W{p.week} · {p.title_en} / {p.title_ar} {isAdmin && <ActionButton action="plan.delete" payload={{ id: p.id }} label="×" confirm={L('Delete this item?', 'حذف هذا البند؟')} />}</li>)}</ul>
        </details>
        {isAdmin && (
          <AdminForm resetOnSuccess className="form-grid two">
            <input type="hidden" name="action" value="plan.save" /><input type="hidden" name="course_id" value={id} />
            <div className="field"><label>Title (EN)</label><input name="title_en" className="input" required /></div>
            <div className="field"><label>العنوان (AR)</label><input name="title_ar" className="input" required dir="rtl" /></div>
            <div className="field"><label>{L('Week', 'الأسبوع')}</label><input name="week" className="input" type="number" min="1" defaultValue={1} /></div>
            <div className="field"><label>{L('Domain (optional)', 'المجال (اختياري)')}</label><select name="domain_id" className="input"><option value="">—</option>{domains.map((d) => <option key={d.id} value={d.id}>{d.name_en}</option>)}</select></div>
            <div><button className="btn btn-dark btn-sm">{L('Add item', 'إضافة بند')}</button></div>
          </AdminForm>
        )}
      </section>
    </>
  );
}
