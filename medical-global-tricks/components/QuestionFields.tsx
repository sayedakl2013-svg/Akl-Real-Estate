export function QuestionFields({ q, domains, courseId, L }: { q?: any; domains: any[]; courseId: number; L: (en: string, ar: string) => string }) {
  return (
    <>
      <input type="hidden" name="action" value="question.save" />
      <input type="hidden" name="course_id" value={courseId} />
      {q?.id && <input type="hidden" name="id" value={q.id} />}
      <div className="field"><label htmlFor="q-d">{L('Domain', 'المجال')}</label>
        <select id="q-d" name="domain_id" className="input" defaultValue={q?.domain_id ?? domains[0]?.id}>{domains.map((d) => <option key={d.id} value={d.id}>{d.name_en}</option>)}</select></div>
      <div className="field"><label htmlFor="q-p">{L('Question', 'السؤال')}</label><textarea id="q-p" name="prompt" className="input" required defaultValue={q?.prompt ?? ''} dir="ltr" /></div>
      <div className="field"><label htmlFor="q-a">{L('Reference answer (short)', 'الإجابة المرجعية (مختصرة)')}</label><textarea id="q-a" name="answer" className="input" required defaultValue={q?.answer ?? ''} dir="ltr" /></div>
      <div className="field"><label htmlFor="q-h">{L('Explanation (HTML: b, i, p, ul, ol, li, table, br)', 'الشرح (HTML محدود)')}</label><textarea id="q-h" name="detail_html" className="input" style={{ minHeight: 200, fontFamily: 'ui-monospace, monospace', fontSize: 13 }} defaultValue={q?.detail_html ?? ''} dir="ltr" /></div>
      <div className="field"><label htmlFor="q-s">{L('Source / reference', 'المصدر / المرجع')}</label><input id="q-s" name="source" className="input" defaultValue={q?.source ?? ''} dir="ltr" /></div>
      <div className="field"><label htmlFor="q-v">{L('Verification note (optional)', 'ملاحظة تحقق (اختياري)')}</label><textarea id="q-v" name="verification_note" className="input" defaultValue={q?.verification_note ?? ''} dir="ltr" /></div>
      <p className="hint">{L('Only enter content taken from verified references. The platform never generates or auto-corrects medical content.', 'أدخل محتوى من مراجع موثّقة فقط. لا تُنشئ المنصة محتوى طبيًا ولا تصححه آليًا.')}</p>
    </>
  );
}
