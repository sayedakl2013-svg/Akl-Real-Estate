import 'server-only';
import { one, q, tx } from './db';
import { HttpError, int, str } from './http';
import { cleanHtml } from './sanitize';
import { audit } from './audit';
import type { SessionUser } from './auth';

type Action = { role: 'editor' | 'admin'; run: (actor: SessionUser, b: any, ip: string) => Promise<unknown> };
const COUNTRIES = /^[A-Z]{2}$/;
const nullableInt = (v: unknown) => (v === '' || v === null || v === undefined ? null : int(v));

async function snapshotQuestion(id: number, actor: string) {
  await q(`INSERT INTO question_revisions(question_id, version, data, edited_by)
           SELECT id, version, to_jsonb(questions.*) - 'id', $2 FROM questions WHERE id = $1`, [id, actor]);
}

export const actions: Record<string, Action> = {
  'course.save': {
    role: 'admin',
    run: async (a, b) => {
      const f = {
        slug: str(b.slug, 80).toLowerCase(), title_en: str(b.title_en, 200), title_ar: str(b.title_ar, 200),
        summary_en: str(b.summary_en, 2000), summary_ar: str(b.summary_ar, 2000), country: str(b.country, 2).toUpperCase(),
        authority: str(b.authority, 40), track: str(b.track, 40), specialty: str(b.specialty, 120),
        exam_format: ['oral', 'mcq', 'mixed'].includes(b.exam_format) ? b.exam_format : 'oral',
        status: ['available', 'planned', 'draft', 'archived'].includes(b.status) ? b.status : 'draft', sort_order: int(b.sort_order, 100),
      };
      if (!/^[a-z0-9-]{3,80}$/.test(f.slug) || !f.title_en || !f.title_ar || !COUNTRIES.test(f.country) || !f.authority || !f.track || !f.specialty) throw new HttpError(400, 'invalid_fields');
      if (f.status === 'available') {
        // A course can only be marked available once it has published questions.
        const id = nullableInt(b.id);
        const n = id ? await one(`SELECT count(*)::int AS n FROM questions WHERE course_id = $1 AND status = 'published'`, [id]) : { n: 0 };
        if (!n?.n) throw new HttpError(400, 'no_published_content');
      }
      const vals = Object.values(f);
      if (b.id) {
        await q(`UPDATE courses SET slug=$2, title_en=$3, title_ar=$4, summary_en=$5, summary_ar=$6, country=$7, authority=$8, track=$9,
                 specialty=$10, exam_format=$11, status=$12, sort_order=$13, updated_at=now() WHERE id=$1`, [int(b.id), ...vals]);
        await audit(a.id, 'course.update', 'course', int(b.id), f);
        return { id: int(b.id) };
      }
      const row = await one(`INSERT INTO courses(slug, title_en, title_ar, summary_en, summary_ar, country, authority, track, specialty, exam_format, status, sort_order)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id`, vals);
      await audit(a.id, 'course.create', 'course', row.id, f);
      return { id: row.id };
    },
  },
  'domain.save': {
    role: 'admin',
    run: async (a, b) => {
      const f = [int(b.course_id), str(b.code, 10).toUpperCase(), str(b.name_en, 120), str(b.name_ar, 120), str(b.description_en, 500), str(b.description_ar, 500),
        /^#[0-9a-fA-F]{6}$/.test(b.color) ? b.color : '#14B8A6', int(b.sort_order)];
      if (!f[1] || !f[2] || !f[3]) throw new HttpError(400, 'invalid_fields');
      if (b.id) await q(`UPDATE domains SET code=$3, name_en=$4, name_ar=$5, description_en=$6, description_ar=$7, color=$8, sort_order=$9 WHERE id=$1 AND course_id=$2`, [int(b.id), ...f]);
      else await q(`INSERT INTO domains(course_id, code, name_en, name_ar, description_en, description_ar, color, sort_order) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`, f);
      await audit(a.id, b.id ? 'domain.update' : 'domain.create', 'domain', b.id ?? null, { code: f[1] });
    },
  },
  'offer.save': {
    role: 'admin',
    run: async (a, b) => {
      const kind = b.kind === 'subscription' ? 'subscription' : 'one_time';
      const amount = Math.round(Number(b.amount) * 100);
      const currency = str(b.currency, 3).toLowerCase();
      if (!Number.isFinite(amount) || amount <= 0 || !/^[a-z]{3}$/.test(currency) || !str(b.label_en) || !str(b.label_ar)) throw new HttpError(400, 'invalid_fields');
      const interval = kind === 'subscription' ? (b.interval === 'year' ? 'year' : 'month') : null;
      const row = await one(`INSERT INTO course_offers(course_id, kind, label_en, label_ar, currency, amount_minor, access_days, interval, interval_count)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
        [int(b.course_id), kind, str(b.label_en, 120), str(b.label_ar, 120), currency, amount, kind === 'one_time' ? nullableInt(b.access_days) : null, interval, Math.max(1, int(b.interval_count, 1))]);
      await audit(a.id, 'offer.create', 'offer', row.id, { amount, currency, kind });
    },
  },
  'offer.toggle': {
    role: 'admin',
    run: async (a, b) => {
      await q('UPDATE course_offers SET active = $2 WHERE id = $1', [int(b.id), !!b.active]);
      await audit(a.id, 'offer.toggle', 'offer', int(b.id), { active: !!b.active });
    },
  },
  'question.save': {
    role: 'editor',
    run: async (a, b) => {
      const courseId = int(b.course_id), domainId = int(b.domain_id);
      const dom = await one('SELECT id FROM domains WHERE id = $1 AND course_id = $2', [domainId, courseId]);
      const prompt = str(b.prompt, 2000), answer = str(b.answer, 4000);
      if (!dom || !prompt || !answer) throw new HttpError(400, 'invalid_fields');
      const detail = cleanHtml(String(b.detail_html ?? '').slice(0, 50_000));
      const source = str(b.source, 1000), note = str(b.verification_note, 2000) || null;
      if (b.id) {
        const id = int(b.id);
        const cur = await one('SELECT status FROM questions WHERE id = $1 AND course_id = $2', [id, courseId]);
        if (!cur) throw new HttpError(404, 'not_found');
        await snapshotQuestion(id, a.id);
        // Editors' changes to live content go back through review; admin edits stay live.
        const status = cur.status === 'published' && a.role !== 'admin' ? 'in_review' : cur.status;
        await q(`UPDATE questions SET domain_id=$2, prompt=$3, answer=$4, detail_html=$5, source=$6, verification_note=$7, status=$8,
                 version = version + 1, updated_by=$9, updated_at=now() WHERE id=$1`, [id, domainId, prompt, answer, detail, source, note, status, a.id]);
        await audit(a.id, 'question.update', 'question', id, { status });
        return { id };
      }
      const row = await one(`INSERT INTO questions(course_id, domain_id, prompt, answer, detail_html, source, verification_note, status, created_by, updated_by)
        VALUES ($1,$2,$3,$4,$5,$6,$7,'draft',$8,$8) RETURNING id`, [courseId, domainId, prompt, answer, detail, source, note, a.id]);
      await audit(a.id, 'question.create', 'question', row.id);
      return { id: row.id };
    },
  },
  'question.status': {
    role: 'editor',
    run: async (a, b) => {
      const status = str(b.status, 20);
      if (!['draft', 'in_review', 'published', 'archived'].includes(status)) throw new HttpError(400, 'invalid_fields');
      if ((status === 'published' || status === 'archived') && a.role !== 'admin') throw new HttpError(403, 'forbidden');
      const r = await one(`UPDATE questions SET status = $2, reviewed_by = CASE WHEN $2 = 'published' THEN $3::uuid ELSE reviewed_by END,
        published_at = CASE WHEN $2 = 'published' THEN now() ELSE published_at END, updated_at = now() WHERE id = $1 RETURNING id`, [int(b.id), status, a.id]);
      if (!r) throw new HttpError(404, 'not_found');
      await audit(a.id, 'question.status', 'question', int(b.id), { status });
    },
  },
  'question.bulk_publish': {
    role: 'admin',
    run: async (a, b) => {
      const from = b.from === 'in_review' ? 'in_review' : 'draft';
      const rows = await q(`UPDATE questions SET status = 'published', reviewed_by = $3, published_at = now(), updated_at = now()
                             WHERE course_id = $1 AND status = $2 RETURNING id`, [int(b.course_id), from, a.id]);
      await audit(a.id, 'question.bulk_publish', 'course', int(b.course_id), { from, count: rows.length });
      return { count: rows.length };
    },
  },
  'user.verify': {
    role: 'admin',
    run: async (a, b) => {
      await q('UPDATE users SET email_verified_at = COALESCE(email_verified_at, now()) WHERE id = $1', [str(b.id, 64)]);
      await audit(a.id, 'user.verify', 'user', str(b.id, 64));
    },
  },
  'user.disable': {
    role: 'admin',
    run: async (a, b) => {
      const id = str(b.id, 64);
      if (id === a.id) throw new HttpError(400, 'cannot_disable_self');
      await q('UPDATE users SET disabled_at = CASE WHEN $2 THEN now() ELSE NULL END WHERE id = $1', [id, !!b.disabled]);
      if (b.disabled) await q('UPDATE sessions SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL', [id]);
      await audit(a.id, b.disabled ? 'user.disable' : 'user.enable', 'user', id);
    },
  },
  'user.role': {
    role: 'admin',
    run: async (a, b) => {
      const id = str(b.id, 64), role = str(b.role, 10);
      if (!['student', 'editor', 'admin'].includes(role)) throw new HttpError(400, 'invalid_fields');
      if (id === a.id) throw new HttpError(400, 'cannot_change_own_role');
      await q('UPDATE users SET role = $2 WHERE id = $1', [id, role]);
      await audit(a.id, 'user.role', 'user', id, { role });
    },
  },
  'enrollment.grant': {
    role: 'admin',
    run: async (a, b) => {
      const userId = str(b.user_id, 64), courseId = int(b.course_id), days = nullableInt(b.days);
      const c = await one(`SELECT id FROM courses WHERE id = $1 AND status = 'available'`, [courseId]);
      if (!c) throw new HttpError(400, 'course_not_available');
      const row = await one(`INSERT INTO enrollments(user_id, course_id, source, status, expires_at, granted_by, note)
        VALUES ($1,$2,'admin_grant','active', CASE WHEN $3::int IS NULL THEN NULL ELSE now() + make_interval(days => $3::int) END, $4, $5) RETURNING id`,
        [userId, courseId, days, a.id, str(b.note, 300) || null]);
      await audit(a.id, 'enrollment.grant', 'enrollment', row.id, { userId, courseId, days });
    },
  },
  'enrollment.revoke': {
    role: 'admin',
    run: async (a, b) => {
      await q(`UPDATE enrollments SET status = 'revoked', updated_at = now() WHERE id = $1`, [str(b.id, 64)]);
      await audit(a.id, 'enrollment.revoke', 'enrollment', str(b.id, 64));
    },
  },
  'device.revoke': {
    role: 'admin',
    run: async (a, b) => {
      const id = str(b.id, 64);
      await q('UPDATE devices SET revoked_at = now() WHERE id = $1', [id]);
      await q('UPDATE sessions SET revoked_at = now() WHERE device_id = $1 AND revoked_at IS NULL', [id]);
      await audit(a.id, 'device.revoke', 'device', id);
    },
  },
  'devicereq.decide': {
    role: 'admin',
    run: async (a, b) => {
      const id = str(b.id, 64), approve = !!b.approve, note = str(b.note, 300) || null;
      await tx(async (c) => {
        const { rows: [r] } = await c.query(`SELECT * FROM device_replacement_requests WHERE id = $1 AND status = 'pending' FOR UPDATE`, [id]);
        if (!r) throw new HttpError(404, 'not_found');
        if (approve) {
          if (r.replace_device_id) {
            await c.query('UPDATE devices SET revoked_at = now() WHERE id = $1', [r.replace_device_id]);
            await c.query('UPDATE sessions SET revoked_at = now() WHERE device_id = $1 AND revoked_at IS NULL', [r.replace_device_id]);
          }
          await c.query(`INSERT INTO devices(user_id, device_key_hash, label) VALUES ($1,$2,$3)
            ON CONFLICT (user_id, device_key_hash) DO UPDATE SET revoked_at = NULL, last_seen_at = now()`, [r.user_id, r.new_device_key_hash, r.new_device_label]);
        }
        await c.query(`UPDATE device_replacement_requests SET status = $2, admin_note = $3, decided_by = $4, decided_at = now() WHERE id = $1`,
          [id, approve ? 'approved' : 'rejected', note, a.id]);
      });
      await audit(a.id, approve ? 'devicereq.approve' : 'devicereq.reject', 'device_replacement_request', id);
    },
  },
  'file.status': {
    role: 'admin',
    run: async (a, b) => {
      const status = ['draft', 'published', 'archived'].includes(b.status) ? b.status : 'draft';
      await q('UPDATE course_files SET status = $2, updated_at = now() WHERE id = $1', [int(b.id), status]);
      await audit(a.id, 'file.status', 'course_file', int(b.id), { status });
    },
  },
  'video.save': {
    role: 'admin',
    run: async (a, b) => {
      const type = b.source_type === 'vimeo' ? 'vimeo' : 'youtube';
      const ext = str(b.external_id, 64);
      if (!/^[\w-]{4,64}$/.test(ext) || !str(b.title_en) || !str(b.title_ar)) throw new HttpError(400, 'invalid_fields');
      const row = await one(`INSERT INTO videos(course_id, title_en, title_ar, kind, source_type, external_id, access, status, sort_order)
        VALUES ($1,$2,$3,$4,$5,$6,$7,'draft',$8) RETURNING id`,
        [nullableInt(b.course_id), str(b.title_en, 200), str(b.title_ar, 200), b.kind === 'promo' ? 'promo' : 'lesson', type, ext, b.access === 'public' ? 'public' : 'enrolled', int(b.sort_order)]);
      await audit(a.id, 'video.create', 'video', row.id);
    },
  },
  'video.status': {
    role: 'admin',
    run: async (a, b) => {
      const status = ['draft', 'published', 'archived'].includes(b.status) ? b.status : 'draft';
      await q('UPDATE videos SET status = $2 WHERE id = $1', [int(b.id), status]);
      await audit(a.id, 'video.status', 'video', int(b.id), { status });
    },
  },
  'plan.save': {
    role: 'admin',
    run: async (a, b) => {
      const f = [int(b.course_id), nullableInt(b.domain_id), Math.max(1, int(b.week, 1)), int(b.sort_order), str(b.title_en, 200), str(b.title_ar, 200)];
      if (!f[4] || !f[5]) throw new HttpError(400, 'invalid_fields');
      await q('INSERT INTO study_plan_items(course_id, domain_id, week, sort_order, title_en, title_ar) VALUES ($1,$2,$3,$4,$5,$6)', f);
      await audit(a.id, 'plan.create', 'course', f[0]);
    },
  },
  'plan.delete': {
    role: 'admin',
    run: async (a, b) => {
      await q('DELETE FROM study_plan_items WHERE id = $1', [int(b.id)]);
      await audit(a.id, 'plan.delete', 'study_plan_item', int(b.id));
    },
  },
};
