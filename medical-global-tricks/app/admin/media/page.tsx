import { adminCtx } from '@/lib/adminPage';
import { q } from '@/lib/db';
import { AdminForm, ActionButton, UploadForm } from '@/components/AdminForms';

export default async function Media() {
  const { L } = await adminCtx('admin');
  const [courses, domains, files, videos] = await Promise.all([
    q('SELECT id, title_en FROM courses ORDER BY sort_order'),
    q('SELECT d.id, d.name_en, c.title_en FROM domains d JOIN courses c ON c.id = d.course_id ORDER BY c.sort_order, d.sort_order'),
    q('SELECT f.*, d.name_en AS domain, c.title_en AS course FROM course_files f JOIN courses c ON c.id = f.course_id LEFT JOIN domains d ON d.id = f.domain_id ORDER BY c.sort_order, d.sort_order, f.id'),
    q('SELECT v.*, c.title_en AS course FROM videos v LEFT JOIN courses c ON c.id = v.course_id ORDER BY v.id'),
  ]);
  const next = (s: string) => (s === 'published' ? 'draft' : 'published');
  return (
    <>
      <h2>{L('PDFs & videos', 'الملفات والفيديوهات')}</h2>
      <p className="muted">{L('Files are stored privately and served only to students with access to the course. Drafts are visible to staff only.', 'تُخزّن الملفات بشكل خاص ولا تُعرض إلا للطلاب الذين لديهم صلاحية الكورس. المسودات تظهر للفريق فقط.')}</p>
      <section className="card stack">
        <h3 style={{ margin: 0 }}>{L('Summary PDFs', 'ملخصات PDF')} ({files.length})</h3>
        <div className="table-wrap"><table className="table"><tbody>{files.map((f) => (
          <tr key={f.id}><td>{f.title}</td><td>{f.course}</td><td>{f.domain ?? '—'}</td><td>{Math.round(Number(f.size_bytes) / 1024)} KB</td><td>{f.status}</td>
            <td><a href={`/api/files/${f.id}`} target="_blank" rel="noopener">{L('Open', 'فتح')}</a></td>
            <td><ActionButton action="file.status" payload={{ id: f.id, status: next(f.status) }} label={f.status === 'published' ? L('Unpublish', 'إلغاء النشر') : L('Publish', 'نشر')} /></td></tr>
        ))}</tbody></table></div>
        <details><summary style={{ cursor: 'pointer', fontWeight: 700 }}>{L('Upload PDF', 'رفع ملف PDF')}</summary>
          <UploadForm kind="pdf">
            <div className="form-grid two">
              <div className="field"><label>{L('Course', 'الكورس')}</label><select name="course_id" className="input">{courses.map((c) => <option key={c.id} value={c.id}>{c.title_en}</option>)}</select></div>
              <div className="field"><label>{L('Domain', 'المجال')}</label><select name="domain_id" className="input"><option value="">—</option>{domains.map((d) => <option key={d.id} value={d.id}>{d.title_en} · {d.name_en}</option>)}</select></div>
              <div className="field"><label>{L('Title', 'العنوان')}</label><input name="title" className="input" required /></div>
              <div className="field"><label>PDF</label><input name="file" type="file" accept="application/pdf" required /></div>
            </div>
            <div><button className="btn btn-dark">{L('Upload', 'رفع')}</button></div>
          </UploadForm>
        </details>
      </section>

      <section className="card stack">
        <h3 style={{ margin: 0 }}>{L('Videos', 'الفيديوهات')} ({videos.length})</h3>
        <div className="table-wrap"><table className="table"><tbody>{videos.map((v) => (
          <tr key={v.id}><td>{v.title_en}<div className="faint">{v.title_ar}</div></td><td>{v.course ?? L('Site-wide', 'عام')}</td><td>{v.kind}</td><td>{v.source_type}</td><td>{v.access}</td><td>{v.status}</td>
            <td><ActionButton action="video.status" payload={{ id: v.id, status: next(v.status) }} label={v.status === 'published' ? L('Unpublish', 'إلغاء النشر') : L('Publish', 'نشر')} /></td></tr>
        ))}</tbody></table></div>
        <div className="grid grid-2">
          <details><summary style={{ cursor: 'pointer', fontWeight: 700 }}>{L('Upload video file (MP4/WebM)', 'رفع ملف فيديو')}</summary>
            <UploadForm kind="video">
              <div className="field"><label>{L('Course (empty = site-wide promo)', 'الكورس (فارغ = إعلان عام)')}</label><select name="course_id" className="input"><option value="">—</option>{courses.map((c) => <option key={c.id} value={c.id}>{c.title_en}</option>)}</select></div>
              <div className="field"><label>Title (EN)</label><input name="title_en" className="input" required /></div>
              <div className="field"><label>العنوان (AR)</label><input name="title_ar" className="input" required dir="rtl" /></div>
              <div className="field"><label>{L('Type', 'النوع')}</label><select name="video_kind" className="input"><option value="lesson">lesson</option><option value="promo">promo</option></select></div>
              <div className="field"><label>{L('Access', 'الوصول')}</label><select name="access" className="input"><option value="enrolled">enrolled</option><option value="public">public</option></select></div>
              <div className="field"><label>{L('File', 'الملف')}</label><input name="file" type="file" accept="video/mp4,video/webm" required /></div>
              <div><button className="btn btn-dark">{L('Upload', 'رفع')}</button></div>
            </UploadForm>
          </details>
          <details><summary style={{ cursor: 'pointer', fontWeight: 700 }}>{L('Link YouTube / Vimeo video', 'ربط فيديو YouTube / Vimeo')}</summary>
            <AdminForm resetOnSuccess>
              <input type="hidden" name="action" value="video.save" />
              <div className="field"><label>{L('Course', 'الكورس')}</label><select name="course_id" className="input">{courses.map((c) => <option key={c.id} value={c.id}>{c.title_en}</option>)}</select></div>
              <div className="field"><label>Title (EN)</label><input name="title_en" className="input" required /></div>
              <div className="field"><label>العنوان (AR)</label><input name="title_ar" className="input" required dir="rtl" /></div>
              <div className="field"><label>{L('Provider', 'المزوّد')}</label><select name="source_type" className="input"><option>youtube</option><option>vimeo</option></select></div>
              <div className="field"><label>{L('Video ID (unlisted recommended)', 'معرّف الفيديو')}</label><input name="external_id" className="input" required dir="ltr" /></div>
              <input type="hidden" name="access" value="enrolled" />
              <div><button className="btn btn-dark">{L('Add', 'إضافة')}</button></div>
            </AdminForm>
          </details>
        </div>
        <p className="hint" style={{ margin: 0 }}>{L('Note: an embedded YouTube/Vimeo link is only as private as its settings on that platform. Use domain-restricted Vimeo or file uploads for paid lessons.', 'ملاحظة: خصوصية روابط YouTube/Vimeo تعتمد على إعداداتها هناك. استخدم Vimeo المقيّد بالنطاق أو رفع الملفات للدروس المدفوعة.')}</p>
      </section>
    </>
  );
}
