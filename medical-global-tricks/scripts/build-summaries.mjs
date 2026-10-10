// Builds one English summary PDF per domain from the course's *published* content and registers it
// as a draft course file (publish it from Admin → PDFs). Usage: node scripts/build-summaries.mjs [course-slug] [--publish]
// The summary restructures the existing reference answers — explanation, key points and review keys —
// and deliberately contains no questions and no new clinical content.
import './env.mjs';
import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';
import { chromium } from 'playwright';

const slug = process.argv.find((a, i) => i > 1 && !a.startsWith('--')) ?? 'aesthetic-medicine-oral';
const publish = process.argv.includes('--publish');
const storage = path.resolve(process.env.STORAGE_DIR ?? './storage');
const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
await db.connect();
const { rows: [course] } = await db.query('SELECT * FROM courses WHERE slug = $1', [slug]);
if (!course) throw new Error(`course ${slug} not found`);
const { rows: domains } = await db.query('SELECT * FROM domains WHERE course_id = $1 ORDER BY sort_order', [course.id]);

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const strip = (h) => h.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim();
const year = new Date().getFullYear();

function reviewKeys(items) {
  const seen = new Set();
  const keys = [];
  for (const it of items) {
    for (const m of it.detail_html.matchAll(/<(?:b|strong)>([\s\S]*?)<\/(?:b|strong)>/g)) {
      const k = strip(m[1]).replace(/[:：]\s*$/, '');
      const norm = k.toLowerCase();
      if (k.length < 3 || k.length > 90 || seen.has(norm) || /^(technique|signs|management|mechanism|definition|rationale|incidence|for \w+|note|treatment|prevention|causes?)$/i.test(k)) continue;
      seen.add(norm); keys.push(k);
    }
  }
  return keys.slice(0, 80);
}

const css = `
  @page { size: A4; margin: 18mm 16mm 20mm; }
  * { box-sizing: border-box; }
  body { font-family: 'Manrope', 'Segoe UI', Arial, sans-serif; color: #0f1b2d; font-size: 10.5pt; line-height: 1.5; }
  .cover { background: #050e1c; color: #fff; border-radius: 14px; padding: 22px 24px; margin-bottom: 18px; position: relative; overflow: hidden; }
  .cover::after { content: ''; position: absolute; right: -40px; top: -40px; width: 180px; height: 180px; border-radius: 50%; background: radial-gradient(circle, rgba(45,212,191,.45), transparent 70%); }
  .brand { color: #5eead4; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; font-size: 9pt; }
  h1 { font-size: 22pt; margin: 6px 0 4px; }
  .scope { color: #c9d6e8; margin: 0; }
  .meta { color: #9fb3cf; font-size: 8.5pt; margin-top: 10px; }
  .bar { height: 4px; border-radius: 4px; margin: 14px 0 0; }
  h2 { font-size: 13pt; color: #0a1a30; border-bottom: 2px solid #14b8a6; padding-bottom: 4px; margin: 18px 0 10px; }
  .howto { background: #e8fbf8; border: 1px solid #b5ece3; border-radius: 10px; padding: 10px 12px; font-size: 9.5pt; }
  .kp { break-inside: avoid; border: 1px solid #e2e8f0; border-left: 4px solid var(--c); border-radius: 8px; padding: 10px 12px; margin-bottom: 10px; }
  .kp .n { font-size: 8pt; color: #7a879b; font-weight: 700; }
  .kp .key { font-weight: 800; color: #064e3b; background: #e7f8f1; border-radius: 6px; padding: 6px 8px; margin: 4px 0 8px; }
  .kp .detail p { margin: 0 0 5px; } .kp .detail ul, .kp .detail ol { margin: 2px 0 6px; padding-left: 18px; }
  .kp table { border-collapse: collapse; width: 100%; font-size: 8.5pt; margin: 4px 0; } .kp td, .kp th { border: 1px solid #d5dde8; padding: 3px 5px; vertical-align: top; }
  .src { font-size: 8.3pt; color: #6b5414; margin-top: 6px; }
  .vn { font-size: 8.5pt; background: #f0eefe; border: 1px solid #d9d4fc; color: #3b2f9a; border-radius: 6px; padding: 5px 8px; margin-top: 6px; }
  .keys { columns: 2; column-gap: 22px; padding-left: 0; list-style: none; margin: 0; }
  .keys li { break-inside: avoid; padding: 3px 0 3px 18px; position: relative; font-size: 9.5pt; }
  .keys li::before { content: ''; position: absolute; left: 2px; top: 9px; width: 9px; height: 9px; border: 1.5px solid #14b8a6; border-radius: 2px; }
  .legal { margin-top: 18px; font-size: 8pt; color: #7a879b; border-top: 1px solid #e2e8f0; padding-top: 8px; }
`;

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage();
let made = 0;
for (const d of domains) {
  const { rows: items } = await db.query(
    `SELECT answer, detail_html, source, verification_note FROM questions WHERE domain_id = $1 AND status = 'published' ORDER BY id`, [d.id]);
  if (!items.length) continue;
  const keys = reviewKeys(items);
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><style>${css}</style></head><body style="--c:${d.color}">
    <div class="cover">
      <div class="brand">Medical Global Tricks · Summary</div>
      <h1>${esc(d.name_en)}</h1>
      <p class="scope">${esc(d.description_en)}</p>
      <div class="meta">${esc(course.title_en)} · ${items.length} key points · ${keys.length} review keys · English</div>
      <div class="bar" style="background:${d.color}"></div>
    </div>
    <div class="howto"><b>How to use this summary.</b> Read each key point with its explanation, then use the review keys at the end as a self-check list: for each key, explain it aloud without looking. Items marked “Verification note” are where the course sources disagree — know both positions.</div>
    <h2>Key points &amp; explanations</h2>
    ${items.map((it, i) => `<div class="kp"><div class="n">KEY POINT ${i + 1}</div><div class="key">${esc(it.answer)}</div>
      ${it.detail_html ? `<div class="detail">${it.detail_html}</div>` : ''}
      ${it.verification_note ? `<div class="vn"><b>⚠ Verification note:</b> ${esc(it.verification_note)}</div>` : ''}
      ${it.source ? `<div class="src">Source: ${esc(it.source)}</div>` : ''}</div>`).join('')}
    <h2>Review keys</h2>
    <ul class="keys">${keys.map((k) => `<li>${esc(k)}</li>`).join('')}</ul>
    <div class="legal">Compiled from the course’s cited reference material; this summary adds no new clinical content. Always confirm against current official guidelines and product labelling.
      Medical Global Tricks is independent and not affiliated with or endorsed by any examination authority. Platform design © ${year} Medical Global Tricks. All rights reserved. Cited references remain the property of their respective owners. Licensed to enrolled students only — do not redistribute.</div>
  </body></html>`;
  await page.setContent(html, { waitUntil: 'load' });
  const pdf = await page.pdf({
    format: 'A4', printBackground: true, displayHeaderFooter: true,
    headerTemplate: '<div></div>',
    footerTemplate: `<div style="font-size:7pt;color:#7a879b;width:100%;padding:0 16mm;display:flex;justify-content:space-between;font-family:Arial"><span>Medical Global Tricks · ${esc(d.name_en)}</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>`,
    margin: { top: '16mm', bottom: '18mm', left: '14mm', right: '14mm' },
  });
  const key = `summaries/${slug}/${d.code}.pdf`;
  fs.mkdirSync(path.join(storage, path.dirname(key)), { recursive: true });
  fs.writeFileSync(path.join(storage, key), pdf);
  await db.query(
    `INSERT INTO course_files(course_id, domain_id, kind, title, storage_key, size_bytes, status)
     VALUES ($1,$2,'summary_pdf',$3,$4,$5,$6)
     ON CONFLICT (storage_key) DO UPDATE SET size_bytes = EXCLUDED.size_bytes, updated_at = now(),
       status = CASE WHEN $7 THEN 'published' ELSE course_files.status END`,
    [course.id, d.id, `${d.name_en} — Summary`, key, pdf.length, publish ? 'published' : 'draft', publish]);
  made++;
  console.log(`  ${d.code} ${d.name_en}: ${items.length} points, ${keys.length} keys, ${Math.round(pdf.length / 1024)} KB`);
}
await browser.close();
await db.end();
console.log(`built ${made} summary PDFs${publish ? ' (published)' : ' (draft — publish in Admin → PDFs)'}`);
