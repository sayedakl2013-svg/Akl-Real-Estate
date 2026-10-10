import type { Course } from '@/lib/access';

export function CourseFields({ c, L }: { c?: Partial<Course>; L: (en: string, ar: string) => string }) {
  const F = ({ name, label, def, ...rest }: any) => (
    <div className="field"><label htmlFor={`c-${name}`}>{label}</label><input id={`c-${name}`} name={name} className="input" defaultValue={def ?? ''} {...rest} /></div>
  );
  return (
    <>
      {c?.id && <input type="hidden" name="id" value={c.id} />}
      <input type="hidden" name="action" value="course.save" />
      <div className="form-grid two">
        <F name="slug" label="Slug (a-z, 0-9, -)" def={c?.slug} required pattern="[a-z0-9-]{3,80}" dir="ltr" />
        <div className="field"><label htmlFor="c-status">{L('Status', 'الحالة')}</label>
          <select id="c-status" name="status" className="input" defaultValue={c?.status ?? 'draft'}>
            <option value="draft">draft</option><option value="planned">planned</option><option value="available">available</option><option value="archived">archived</option>
          </select></div>
        <F name="title_en" label="Title (EN)" def={c?.title_en} required dir="ltr" />
        <F name="title_ar" label="العنوان (AR)" def={c?.title_ar} required dir="rtl" />
        <div className="field"><label htmlFor="c-se">Summary (EN)</label><textarea id="c-se" name="summary_en" className="input" defaultValue={c?.summary_en ?? ''} dir="ltr" /></div>
        <div className="field"><label htmlFor="c-sa">الوصف (AR)</label><textarea id="c-sa" name="summary_ar" className="input" defaultValue={c?.summary_ar ?? ''} dir="rtl" /></div>
        <F name="country" label={L('Country code (AE, SA…)', 'رمز البلد (AE، SA…)')} def={c?.country ?? 'AE'} required maxLength={2} dir="ltr" />
        <F name="authority" label={L('Authority (MOHAP, DHA, DOH, SCFHS…)', 'الجهة')} def={c?.authority} required dir="ltr" />
        <div className="field"><label htmlFor="c-track">{L('Professional track', 'المسار المهني')}</label>
          <select id="c-track" name="track" className="input" defaultValue={c?.track ?? 'physician'}>
            {['physician', 'nurse', 'pharmacist', 'dentist', 'allied'].map((x) => <option key={x}>{x}</option>)}
          </select></div>
        <F name="specialty" label={L('Specialty', 'التخصص')} def={c?.specialty} required dir="ltr" />
        <div className="field"><label htmlFor="c-fmt">{L('Exam format', 'نوع الامتحان')}</label>
          <select id="c-fmt" name="exam_format" className="input" defaultValue={c?.exam_format ?? 'oral'}><option>oral</option><option>mcq</option><option>mixed</option></select></div>
        <F name="sort_order" label={L('Sort order', 'الترتيب')} def={c?.sort_order ?? 100} type="number" />
      </div>
      <p className="hint">{L('“available” requires at least one published question. Planned courses are shown as not for sale.', '«متاح» يتطلب سؤالًا منشورًا واحدًا على الأقل. الكورسات المخطط لها تظهر كغير متاحة للبيع.')}</p>
    </>
  );
}
