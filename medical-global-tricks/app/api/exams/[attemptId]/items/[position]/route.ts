import { handler, json, int, readJson, HttpError } from '@/lib/http';
import { requireUser } from '@/lib/auth';
import { saveAttemptItem } from '@/lib/study';
import { requireCourseAccess } from '@/lib/access';
import { one } from '@/lib/db';

type Ctx = { params: Promise<{ attemptId: string; position: string }> };
const UUID = /^[0-9a-f-]{36}$/i;

export const PATCH = handler<Ctx>(async (req, { params }) => {
  const user = await requireUser();
  const { attemptId, position } = await params;
  if (!UUID.test(attemptId)) throw new HttpError(404, 'not_found');
  const a = await one('SELECT course_id FROM exam_attempts WHERE id = $1 AND user_id = $2', [attemptId, user.id]);
  if (!a) throw new HttpError(404, 'not_found');
  await requireCourseAccess(user, a.course_id);
  const body = await readJson(req);
  const patch: Parameters<typeof saveAttemptItem>[3] = {};
  if (typeof body.revealed === 'boolean') patch.revealed = body.revealed;
  if (body.rating === null || body.rating === 'recalled' || body.rating === 'review') patch.rating = body.rating;
  if (typeof body.flagged === 'boolean') patch.flagged = body.flagged;
  if (typeof body.note === 'string') patch.note = body.note;
  await saveAttemptItem(user.id, attemptId, int(position), patch);
  return json({ ok: true });
});
