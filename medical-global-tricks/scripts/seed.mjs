// Idempotent catalogue seed. Never deletes or overwrites student data; safe to re-run.
import './env.mjs';
import pg from 'pg';

const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
await db.connect();

const COURSES = [
  {
    slug: 'aesthetic-medicine-oral', status: 'available', sort: 1, country: 'AE', authority: 'MOHAP', track: 'physician',
    specialty: 'Aesthetic Medicine', format: 'oral',
    title_en: 'Aesthetic Medicine — Oral Exam Preparation',
    title_ar: 'طب التجميل — التحضير للامتحان الشفوي',
    summary_en: 'Oral exam rehearsal for aesthetic medicine: reference answers with explanations and sources across 15 domains — anatomy, botulinum toxin, fillers, complications, emergencies, ethics and more.',
    summary_ar: 'تدريب على الامتحان الشفوي في طب التجميل: إجابات مرجعية مع الشرح والمصدر في 15 مجالًا، منها التشريح والبوتولينوم والفيلر والمضاعفات والطوارئ والأخلاقيات.',
  },
  { slug: 'aesthetic-medicine-dha', status: 'planned', sort: 10, country: 'AE', authority: 'DHA', track: 'physician', specialty: 'Aesthetic Medicine', format: 'oral',
    title_en: 'Aesthetic Medicine — DHA track', title_ar: 'طب التجميل — مسار DHA', summary_en: 'Planned course. Content is in preparation.', summary_ar: 'كورس مخطط له. المحتوى قيد الإعداد.' },
  { slug: 'aesthetic-medicine-doh', status: 'planned', sort: 11, country: 'AE', authority: 'DOH', track: 'physician', specialty: 'Aesthetic Medicine', format: 'oral',
    title_en: 'Aesthetic Medicine — DOH track', title_ar: 'طب التجميل — مسار DOH', summary_en: 'Planned course. Content is in preparation.', summary_ar: 'كورس مخطط له. المحتوى قيد الإعداد.' },
  { slug: 'aesthetic-medicine-scfhs', status: 'planned', sort: 20, country: 'SA', authority: 'SCFHS', track: 'physician', specialty: 'Aesthetic Medicine', format: 'oral',
    title_en: 'Aesthetic Medicine — SCFHS track', title_ar: 'طب التجميل — مسار SCFHS', summary_en: 'Planned course. Content is in preparation.', summary_ar: 'كورس مخطط له. المحتوى قيد الإعداد.' },
];

// Domain scopes are taken verbatim from the study binder's table of contents.
const DOMAINS = [
  ['N', 'Anatomy', 'التشريح', 'Layers, muscles, nerves, vessels, fat compartments, danger zones', '#3F5D8A'],
  ['S', 'Consultation', 'الاستشارة وتقييم المريض', 'Contraindications, BDD, special populations, expectations', '#6B4E8E'],
  ['P', 'Pharmacology', 'علم الأدوية', 'Toxin products, mechanism, reconstitution, FDA indications', '#3B6E71'],
  ['T', 'Dosing', 'الجرعات', 'Per-area BoNT dosing & technique', '#8C5A2B'],
  ['C', 'BoNT Complications', 'مضاعفات البوتولينوم', 'Ptosis, contraindications, aftercare, headache', '#8C2F2F'],
  ['F', 'Filler Types', 'أنواع الفيلر', 'HA vs non-HA, G′, cross-linking, permanent fillers', '#4E7D3A'],
  ['I', 'Filler Technique', 'تقنيات حقن الفيلر', 'Techniques, cannula, regional injection technique', '#B8863B'],
  ['X', 'Filler Complications', 'مضاعفات الفيلر', 'Tyndall, biofilm, granulomas, prevention, infection', '#A13E2F'],
  ['H', 'Hyaluronidase', 'الهيالورونيداز', 'Mechanism, allergy, IDT, dosing protocols', '#2F7A6E'],
  ['V', 'Emergencies', 'الطوارئ', 'Vascular occlusion, blindness, anaphylaxis, syncope, emergency kit', '#7A1F1F'],
  ['A', 'Anesthesia', 'التخدير', 'Nerve blocks, topical agents', '#35577A'],
  ['M', 'PRP & Needling', 'البلازما والوخز الدقيق', 'PRP, microneedling, RF microneedling, indications', '#7C5B9E'],
  ['K', 'Combination', 'العلاجات المركّبة', 'Combining toxin, filler, PRP; full-face planning', '#8A6D2F'],
  ['Z', 'Advanced Procedures', 'الإجراءات المتقدمة', 'Rhinoplasty, jawline, hands, neck, Kybella, biostimulators', '#2D6A73'],
  ['E', 'Ethics & Legal', 'الأخلاقيات والجوانب القانونية', 'Consent, documentation, off-label use, standard of care', '#5A5347'],
];

for (const c of COURSES) {
  // Insert only; existing rows keep whatever the admin has edited since.
  await db.query(
    `INSERT INTO courses(slug, title_en, title_ar, summary_en, summary_ar, country, authority, track, specialty, exam_format, status, sort_order)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) ON CONFLICT (slug) DO NOTHING`,
    [c.slug, c.title_en, c.title_ar, c.summary_en, c.summary_ar, c.country, c.authority, c.track, c.specialty, c.format, c.status, c.sort],
  );
}

const { rows: [course] } = await db.query(`SELECT id FROM courses WHERE slug = 'aesthetic-medicine-oral'`);
for (const [i, [code, en, ar, desc, color]] of DOMAINS.entries()) {
  await db.query(
    `INSERT INTO domains(course_id, code, name_en, name_ar, description_en, color, sort_order)
     VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (course_id, code) DO NOTHING`,
    [course.id, code, en, ar, desc, color, i],
  );
}

// Study plan template (structure only — no clinical content). Created once.
const { rows: [{ n }] } = await db.query('SELECT count(*)::int AS n FROM study_plan_items WHERE course_id = $1', [course.id]);
if (n === 0) {
  const { rows: doms } = await db.query('SELECT id, name_en, name_ar FROM domains WHERE course_id = $1 ORDER BY sort_order', [course.id]);
  let order = 0;
  for (const [i, d] of doms.entries()) {
    const week = Math.floor(i / 3) + 1;
    const items = [
      [`Read the ${d.name_en} summary`, `اقرأ ملخص ${d.name_ar}`],
      [`Oral practice: ${d.name_en}`, `تدريب شفوي: ${d.name_ar}`],
      [`Timed exam: ${d.name_en}`, `امتحان مؤقت: ${d.name_ar}`],
    ];
    for (const [en, ar] of items) {
      await db.query('INSERT INTO study_plan_items(course_id, domain_id, week, sort_order, title_en, title_ar) VALUES ($1,$2,$3,$4,$5,$6)',
        [course.id, d.id, week, order++, en, ar]);
    }
  }
  const last = Math.ceil(doms.length / 3) + 1;
  for (const [en, ar] of [
    ['Re-practise everything in the mistakes notebook', 'أعد التدريب على كل ما في دفتر الأخطاء'],
    ['Mixed timed exam across all domains', 'امتحان مؤقت من كل المجالات'],
    ['Review saved questions and verification notes', 'راجع الأسئلة المحفوظة وملاحظات التحقق'],
  ]) {
    await db.query('INSERT INTO study_plan_items(course_id, domain_id, week, sort_order, title_en, title_ar) VALUES ($1,NULL,$2,$3,$4,$5)',
      [course.id, last, order++, en, ar]);
  }
}

console.log('seed complete');
await db.end();
