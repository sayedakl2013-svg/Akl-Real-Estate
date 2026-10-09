// Usage: node scripts/import-binder.mjs <path-to-binder.html> [--status=published|draft]
// Upserts by external_ref, so re-importing updates content without touching student progress.
import './env.mjs';
import fs from 'node:fs';
import pg from 'pg';
import sanitizeHtml from 'sanitize-html';
import { parseBinder } from './binder.mjs';

const file = process.argv[2];
const status = (process.argv.find((a) => a.startsWith('--status=')) ?? '--status=published').split('=')[1];
if (!file) { console.error('usage: import-binder.mjs <file.html>'); process.exit(1); }

const clean = (h) => sanitizeHtml(h, { allowedTags: ['b','strong','i','em','br','p','ul','ol','li','table','thead','tbody','tr','th','td','sup','sub'], allowedAttributes: {} });
const rows = parseBinder(fs.readFileSync(file, 'utf8'));
const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
await db.connect();
const { rows: [course] } = await db.query(`SELECT id FROM courses WHERE slug = 'aesthetic-medicine-oral'`);
const { rows: doms } = await db.query('SELECT id, code FROM domains WHERE course_id = $1', [course.id]);
const byCode = Object.fromEntries(doms.map((d) => [d.code, d.id]));
let inserted = 0, updated = 0, skipped = 0;
await db.query('BEGIN');
for (const r of rows) {
  const domainId = byCode[r.domain];
  if (!domainId) throw new Error(`unknown domain ${r.domain}`);
  const res = await db.query(
    `INSERT INTO questions(course_id, domain_id, external_ref, prompt, answer, detail_html, source, verification_note, status, published_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9, CASE WHEN $9 = 'published' THEN now() END)
     ON CONFLICT (course_id, external_ref) DO UPDATE SET
       domain_id = EXCLUDED.domain_id, prompt = EXCLUDED.prompt, answer = EXCLUDED.answer, detail_html = EXCLUDED.detail_html,
       source = EXCLUDED.source, verification_note = EXCLUDED.verification_note, updated_at = now(),
       version = questions.version + CASE WHEN (questions.prompt, questions.answer, questions.detail_html, questions.source)
                 IS DISTINCT FROM (EXCLUDED.prompt, EXCLUDED.answer, EXCLUDED.detail_html, EXCLUDED.source) THEN 1 ELSE 0 END
     WHERE questions.updated_by IS NULL  -- never overwrite a question an editor has changed in the admin panel
     RETURNING (xmax = 0) AS inserted`,
    [course.id, domainId, r.ref, r.prompt, r.answer, clean(r.detail), r.source, r.note, status],
  );
  if (!res.rows[0]) skipped++; else if (res.rows[0].inserted) inserted++; else updated++;
}
await db.query('COMMIT');
console.log(`binder import: ${rows.length} cards (${inserted} new, ${updated} refreshed, ${skipped} kept because edited in admin)`);
await db.end();
