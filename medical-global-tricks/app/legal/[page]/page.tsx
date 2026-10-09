import { notFound } from 'next/navigation';
import { getT } from '@/lib/i18n';
import { legal } from '@/lib/legal';

export const dynamic = 'force-dynamic';

export default async function LegalPage({ params }: { params: Promise<{ page: string }> }) {
  const { page } = await params;
  const entry = legal[page as keyof typeof legal];
  if (!entry) notFound();
  const { lang } = await getT();
  const doc = entry[lang];
  const draft = process.env.LEGAL_DRAFT !== 'false';
  return (
    <>
      <div className="page-head"><div className="container"><h1>{doc.title}</h1><p className="ltr" style={{ display: 'inline' }}>Medical Global Tricks</p></div></div>
      <div className="container section legal narrow" style={{ paddingTop: 28 }}>
        {draft && <div className="alert alert-warn">{lang === 'ar' ? 'مسودة — بانتظار المراجعة القانونية قبل الإطلاق التجاري.' : 'Draft — pending legal review before commercial launch.'}</div>}
        {doc.sections.map((s) => (
          <section key={s.h}>
            <h2>{s.h}</h2>
            {s.p.map((p, i) => <p key={i}>{p}</p>)}
          </section>
        ))}
        {process.env.CONTACT_EMAIL && <p><b>{lang === 'ar' ? 'للتواصل' : 'Contact'}:</b> <a className="ltr" href={`mailto:${process.env.CONTACT_EMAIL}`}>{process.env.CONTACT_EMAIL}</a></p>}
      </div>
    </>
  );
}

