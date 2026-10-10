import { randomUUID } from 'node:crypto';
import { handler, json, int, str, HttpError } from '@/lib/http';
import { requireStaff } from '@/lib/auth';
import { one, q, tx } from '@/lib/db';
import { saveFile } from '@/lib/storage';
import { cleanHtml } from '@/lib/sanitize';
import { parseBinder } from '@/lib/binder';
import { audit } from '@/lib/audit';

const MAX_PDF = 50 * 1024 * 1024;
const MAX_VIDEO = 240 * 1024 * 1024;

export const POST = handler(async (req) => {
  const actor = await requireStaff('admin');
  const form = await req.formData();
  const kind = str(form.get('kind'), 20);

  if (kind === 'pdf_bulk') {
    // Several summary PDFs at once; the domain is read from the file name prefix ("H-Hyaluronidase.pdf" → H).
    const courseId = int(form.get('course_id'));
    const publish = form.get('publish') === 'on';
    const course = await one('SELECT slug FROM courses WHERE id = $1', [courseId]);
    if (!course) throw new HttpError(404, 'not_found');
    const doms = await q('SELECT id, code, name_en FROM domains WHERE course_id = $1', [courseId]);
    const files = form.getAll('file').filter((f): f is File => f instanceof File && f.size > 0);
    if (!files.length) throw new HttpError(400, 'file_required');
    const done: string[] = [], skipped: string[] = [];
    for (const f of files) {
      const b = Buffer.from(await f.arrayBuffer());
      const code = f.name.split(/[-_ .]/)[0].toUpperCase();
      const d = doms.find((x) => x.code === code);
      if (!d || f.size > MAX_PDF || b.subarray(0, 5).toString() !== '%PDF-') { skipped.push(f.name); continue; }
      const key = `summaries/${course.slug}/${d.code}.pdf`;
      await saveFile(key, b);
      await q(`INSERT INTO course_files(course_id, domain_id, kind, title, storage_key, size_bytes, status)
               VALUES ($1,$2,'summary_pdf',$3,$4,$5,$6)
               ON CONFLICT (storage_key) DO UPDATE SET size_bytes = EXCLUDED.size_bytes, updated_at = now(),
                 status = CASE WHEN $7 THEN 'published' ELSE course_files.status END`,
        [courseId, d.id, `${d.name_en} — Summary`, key, f.size, publish ? 'published' : 'draft', publish]);
      done.push(d.code);
    }
    await audit(actor.id, 'file.bulk_upload', 'course', courseId, { done, skipped });
    return json({ ok: true, total: files.length, inserted: done.length, updated: 0, skipped: skipped.length, skippedNames: skipped });
  }

  const file = form.get('file');
  if (!(file instanceof File) || file.size === 0) throw new HttpError(400, 'file_required');
  const buf = Buffer.from(await file.arrayBuffer());

  if (kind === 'pdf') {
    if (file.size > MAX_PDF || buf.subarray(0, 5).toString() !== '%PDF-') throw new HttpError(400, 'not_a_pdf');
    const courseId = int(form.get('course_id'));
    const domainId = int(form.get('domain_id')) || null;
    const course = await one('SELECT slug FROM courses WHERE id = $1', [courseId]);
    if (!course) throw new HttpError(404, 'not_found');
    const key = `files/${course.slug}/${randomUUID()}.pdf`;
    await saveFile(key, buf);
    const row = await one(`INSERT INTO course_files(course_id, domain_id, kind, title, storage_key, size_bytes, status) VALUES ($1,$2,$3,$4,$5,$6,'draft') RETURNING id`,
      [courseId, domainId, domainId ? 'summary_pdf' : 'other_pdf', str(form.get('title'), 200) || file.name, key, file.size]);
    await audit(actor.id, 'file.upload', 'course_file', row.id);
    return json({ ok: true, id: row.id });
  }

  if (kind === 'video') {
    const mime = file.type || 'video/mp4';
    if (file.size > MAX_VIDEO || !['video/mp4', 'video/webm'].includes(mime)) throw new HttpError(400, 'unsupported_video');
    const key = `videos/${randomUUID()}.${mime === 'video/webm' ? 'webm' : 'mp4'}`;
    await saveFile(key, buf);
    const row = await one(`INSERT INTO videos(course_id, title_en, title_ar, kind, source_type, storage_key, mime, access, status, sort_order)
      VALUES ($1,$2,$3,$4,'file',$5,$6,$7,'draft',$8) RETURNING id`,
      [int(form.get('course_id')) || null, str(form.get('title_en'), 200) || file.name, str(form.get('title_ar'), 200) || file.name,
       form.get('video_kind') === 'promo' ? 'promo' : 'lesson', key, mime, form.get('access') === 'public' ? 'public' : 'enrolled', int(form.get('sort_order'))]);
    await audit(actor.id, 'video.upload', 'video', row.id);
    return json({ ok: true, id: row.id });
  }

  if (kind === 'binder') {
    const courseId = int(form.get('course_id'));
    const status = form.get('status') === 'published' ? 'published' : 'draft';
    const rows = parseBinder(buf.toString('utf8'));
    const result = await tx(async (c) => {
      const { rows: doms } = await c.query('SELECT id, code FROM domains WHERE course_id = $1', [courseId]);
      const byCode = Object.fromEntries(doms.map((d) => [d.code, d.id]));
      let inserted = 0, updated = 0, skipped = 0;
      for (const r of rows) {
        if (!byCode[r.domain]) throw new HttpError(400, `unknown_domain_${r.domain}`);
        const res = await c.query(
          `INSERT INTO questions(course_id, domain_id, external_ref, prompt, answer, detail_html, source, verification_note, status, published_at, created_by)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9, CASE WHEN $9 = 'published' THEN now() END, $10)
           ON CONFLICT (course_id, external_ref) DO UPDATE SET domain_id = EXCLUDED.domain_id, prompt = EXCLUDED.prompt, answer = EXCLUDED.answer,
             detail_html = EXCLUDED.detail_html, source = EXCLUDED.source, verification_note = EXCLUDED.verification_note, updated_at = now()
           WHERE questions.updated_by IS NULL
           RETURNING (xmax = 0) AS inserted`,
          [courseId, byCode[r.domain], r.ref, r.prompt, r.answer, cleanHtml(r.detail), r.source, r.note, status, actor.id]);
        if (!res.rows[0]) skipped++; else if (res.rows[0].inserted) inserted++; else updated++;
      }
      return { total: rows.length, inserted, updated, skipped };
    });
    await audit(actor.id, 'binder.import', 'course', courseId, result);
    return json({ ok: true, ...result });
  }

  throw new HttpError(400, 'unknown_kind');
});
