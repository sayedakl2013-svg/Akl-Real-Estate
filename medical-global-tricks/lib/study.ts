import 'server-only';
import { one, q, tx } from './db';
import { HttpError } from './http';

export type Rating = 'recalled' | 'review';
export interface StudyQuestion {
  id: number; domain_id: number; prompt: string; answer: string; detail_html: string; source: string;
  verification_note: string | null; last_rating: Rating | null; saved: boolean;
}

const Q_COLS = `qq.id, qq.domain_id, qq.prompt, qq.answer, qq.detail_html, qq.source, qq.verification_note,
  qp.last_rating, (b.question_id IS NOT NULL) AS saved`;
const Q_JOINS = `LEFT JOIN question_progress qp ON qp.question_id = qq.id AND qp.user_id = $1
  LEFT JOIN bookmarks b ON b.question_id = qq.id AND b.user_id = $1`;

export async function searchQuestions(userId: string, courseId: number, f: { domainId?: number; text?: string; filter?: string; offset?: number; limit?: number }) {
  const params: unknown[] = [userId, courseId];
  const where = [`qq.course_id = $2`, `qq.status = 'published'`];
  if (f.domainId) { params.push(f.domainId); where.push(`qq.domain_id = $${params.length}`); }
  if (f.text) {
    params.push(`%${f.text.replace(/[\\%_]/g, (m) => '\\' + m)}%`);
    const p = `$${params.length}`;
    where.push(`(qq.prompt ILIKE ${p} OR qq.answer ILIKE ${p} OR qq.detail_html ILIKE ${p} OR qq.source ILIKE ${p})`);
  }
  if (f.filter === 'saved') where.push('b.question_id IS NOT NULL');
  if (f.filter === 'review') where.push(`qp.last_rating = 'review'`);
  if (f.filter === 'unrated') where.push('qp.last_rating IS NULL');
  const limit = Math.min(Math.max(f.limit ?? 30, 1), 500);
  const offset = Math.max(f.offset ?? 0, 0);
  const [rows, total] = await Promise.all([
    q<StudyQuestion>(`SELECT ${Q_COLS} FROM questions qq ${Q_JOINS} WHERE ${where.join(' AND ')} ORDER BY qq.domain_id, qq.id LIMIT ${limit} OFFSET ${offset}`, params),
    one<{ n: number }>(`SELECT count(*)::int AS n FROM questions qq ${Q_JOINS} WHERE ${where.join(' AND ')}`, params),
  ]);
  return { rows, total: total?.n ?? 0 };
}

export async function rateQuestion(userId: string, courseId: number, questionId: number, rating: Rating, context: 'practice' | 'exam', attemptId: string | null = null) {
  const ok = await one(`SELECT 1 FROM questions WHERE id = $1 AND course_id = $2 AND status = 'published'`, [questionId, courseId]);
  if (!ok) throw new HttpError(404, 'not_found');
  await q(
    `INSERT INTO question_progress(user_id, question_id, course_id, last_rating, recalled_count, review_count)
     VALUES ($1,$2,$3,$4, ($4 = 'recalled')::int, ($4 = 'review')::int)
     ON CONFLICT (user_id, question_id) DO UPDATE SET last_rating = $4, last_rated_at = now(),
       recalled_count = question_progress.recalled_count + ($4 = 'recalled')::int,
       review_count = question_progress.review_count + ($4 = 'review')::int`,
    [userId, questionId, courseId, rating],
  );
  await q(`INSERT INTO rating_events(user_id, course_id, question_id, rating, context, attempt_id) VALUES ($1,$2,$3,$4,$5,$6)`,
    [userId, courseId, questionId, rating, context, attemptId]);
}

export async function setBookmark(userId: string, courseId: number, questionId: number, saved: boolean) {
  if (saved) {
    const ok = await one(`SELECT 1 FROM questions WHERE id = $1 AND course_id = $2 AND status = 'published'`, [questionId, courseId]);
    if (!ok) throw new HttpError(404, 'not_found');
    await q(`INSERT INTO bookmarks(user_id, question_id, course_id) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`, [userId, questionId, courseId]);
  } else {
    await q(`DELETE FROM bookmarks WHERE user_id = $1 AND question_id = $2`, [userId, questionId]);
  }
}

export async function domainStats(userId: string, courseId: number) {
  return q<{ id: number; code: string; name_en: string; name_ar: string; color: string; total: number; recalled: number; review: number }>(
    `SELECT d.id, d.code, d.name_en, d.name_ar, d.color,
            count(qq.id)::int AS total,
            count(qp.question_id) FILTER (WHERE qp.last_rating = 'recalled')::int AS recalled,
            count(qp.question_id) FILTER (WHERE qp.last_rating = 'review')::int AS review
       FROM domains d
       LEFT JOIN questions qq ON qq.domain_id = d.id AND qq.status = 'published'
       LEFT JOIN question_progress qp ON qp.question_id = qq.id AND qp.user_id = $1
      WHERE d.course_id = $2
      GROUP BY d.id ORDER BY d.sort_order, d.id`,
    [userId, courseId],
  );
}

// ───────── Timed exams ─────────
const GRACE_SECONDS = 15; // tolerance for in-flight saves when the clock hits zero

/** Finalises any attempt whose time ran out. Called lazily on every read/write. */
export async function expireAttempts(userId: string) {
  const expired = await q<{ id: string }>(
    `UPDATE exam_attempts SET status = 'expired', submitted_at = expires_at
      WHERE user_id = $1 AND status = 'in_progress' AND expires_at + make_interval(secs => $2) < now() RETURNING id`,
    [userId, GRACE_SECONDS]);
  for (const a of expired) await tally(a.id);
}

async function tally(attemptId: string) {
  await q(
    `UPDATE exam_attempts a SET
       recalled = s.recalled, review = s.review, unrated = s.unrated
       FROM (SELECT count(*) FILTER (WHERE rating = 'recalled')::int AS recalled,
                    count(*) FILTER (WHERE rating = 'review')::int AS review,
                    count(*) FILTER (WHERE rating IS NULL)::int AS unrated
               FROM exam_attempt_items WHERE attempt_id = $1) s
      WHERE a.id = $1`,
    [attemptId]);
}

export async function createAttempt(userId: string, courseId: number, opts: { mode: 'domain' | 'mixed' | 'review'; domainId?: number; count: number; minutes: number }) {
  await expireAttempts(userId);
  const count = Math.min(Math.max(opts.count, 1), 100);
  const minutes = Math.min(Math.max(opts.minutes, 1), 300);
  const params: unknown[] = [courseId, userId];
  let filter = '';
  if (opts.mode === 'domain') {
    if (!opts.domainId) throw new HttpError(400, 'domain_required');
    params.push(opts.domainId); filter = `AND qq.domain_id = $3`;
  } else if (opts.mode === 'review') {
    filter = `AND EXISTS (SELECT 1 FROM question_progress qp WHERE qp.question_id = qq.id AND qp.user_id = $2 AND qp.last_rating = 'review')`;
  }
  return tx(async (c) => {
    // One running attempt per user and course keeps "resume" unambiguous.
    const running = await c.query(`SELECT id FROM exam_attempts WHERE user_id = $1 AND course_id = $2 AND status = 'in_progress' FOR UPDATE`, [userId, courseId]);
    if (running.rows[0]) return { id: running.rows[0].id as string, resumed: true };
    const picked = await c.query(
      `SELECT qq.id FROM questions qq WHERE qq.course_id = $1 AND qq.status = 'published' ${filter}
        AND $2::uuid IS NOT NULL ORDER BY random() LIMIT ${count}`, params);
    if (picked.rows.length === 0) throw new HttpError(400, 'not_enough_questions');
    const a = await c.query(
      `INSERT INTO exam_attempts(user_id, course_id, mode, domain_ids, question_count, duration_seconds, expires_at)
       VALUES ($1,$2,$3,$4,$5,$6::int, now() + make_interval(secs => $6::int)) RETURNING id`,
      [userId, courseId, opts.mode, opts.domainId ? [opts.domainId] : [], picked.rows.length, minutes * 60]);
    const id = a.rows[0].id as string;
    await c.query(
      `INSERT INTO exam_attempt_items(attempt_id, position, question_id)
       SELECT $1, ord, qid FROM unnest($2::int[]) WITH ORDINALITY AS t(qid, ord)`,
      [id, picked.rows.map((r) => r.id)]);
    return { id, resumed: false };
  });
}

export async function getAttempt(userId: string, attemptId: string) {
  await expireAttempts(userId);
  const attempt = await one(
    `SELECT a.*, extract(epoch FROM (a.expires_at - now()))::int AS seconds_left, c.slug
       FROM exam_attempts a JOIN courses c ON c.id = a.course_id WHERE a.id = $1 AND a.user_id = $2`, [attemptId, userId]);
  if (!attempt) return null;
  const items = await q(
    `SELECT i.position, i.revealed, i.rating, i.flagged, i.note,
            qq.id AS question_id, qq.domain_id, qq.prompt, qq.answer, qq.detail_html, qq.source, qq.verification_note
       FROM exam_attempt_items i JOIN questions qq ON qq.id = i.question_id
      WHERE i.attempt_id = $1 ORDER BY i.position`, [attemptId]);
  return { attempt, items };
}

export async function saveAttemptItem(userId: string, attemptId: string, position: number,
  patch: { revealed?: boolean; rating?: Rating | null; flagged?: boolean; note?: string }) {
  // Hot path during exams: one indexed read decides ownership, state and expiry.
  const a = await one(`SELECT id, course_id, status, (expires_at + make_interval(secs => $3) < now()) AS late
                         FROM exam_attempts WHERE id = $1 AND user_id = $2`, [attemptId, userId, GRACE_SECONDS]);
  if (!a) throw new HttpError(404, 'not_found');
  if (a.status === 'in_progress' && a.late) { await expireAttempts(userId); throw new HttpError(409, 'attempt_closed'); }
  if (a.status !== 'in_progress') throw new HttpError(409, 'attempt_closed');
  const sets: string[] = []; const params: unknown[] = [attemptId, position];
  if (patch.revealed !== undefined) { params.push(!!patch.revealed); sets.push(`revealed = revealed OR $${params.length}`); }
  if (patch.rating !== undefined) { params.push(patch.rating); sets.push(`rating = $${params.length}`); }
  if (patch.flagged !== undefined) { params.push(!!patch.flagged); sets.push(`flagged = $${params.length}`); }
  if (patch.note !== undefined) { params.push(String(patch.note).slice(0, 4000)); sets.push(`note = $${params.length}`); }
  if (!sets.length) return;
  const row = await one(`UPDATE exam_attempt_items SET ${sets.join(', ')}, updated_at = now() WHERE attempt_id = $1 AND position = $2 RETURNING question_id`, params);
  if (!row) throw new HttpError(404, 'not_found');
  if (patch.rating) await rateQuestion(userId, a.course_id, row.question_id, patch.rating, 'exam', attemptId);
}

export async function submitAttempt(userId: string, attemptId: string) {
  await expireAttempts(userId);
  const a = await one(
    `UPDATE exam_attempts SET status = 'submitted', submitted_at = now()
      WHERE id = $1 AND user_id = $2 AND status = 'in_progress' RETURNING id`, [attemptId, userId]);
  if (a) await tally(attemptId);
  const row = await one(`SELECT id, status FROM exam_attempts WHERE id = $1 AND user_id = $2`, [attemptId, userId]);
  if (!row) throw new HttpError(404, 'not_found');
  return row; // idempotent: a second submit returns the already-closed attempt
}

export async function attemptsFor(userId: string, courseId: number, limit = 50) {
  await expireAttempts(userId);
  return q(`SELECT id, mode, question_count, duration_seconds, started_at, submitted_at, status, recalled, review, unrated
              FROM exam_attempts WHERE user_id = $1 AND course_id = $2 ORDER BY started_at DESC LIMIT $3`, [userId, courseId, limit]);
}
