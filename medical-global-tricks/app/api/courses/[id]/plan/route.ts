import { handler, json, int, readJson, HttpError } from '@/lib/http';
import { requireUser } from '@/lib/auth';
import { requireCourseAccess } from '@/lib/access';
import { one, q } from '@/lib/db';

type Ctx = { params: Promise<{ id: string }> };

export const POST = handler<Ctx>(async (req, { params }) => {
  const user = await requireUser();
  const course = await requireCourseAccess(user, int((await params).id));
  const body = await readJson(req);
  const item = await one('SELECT id FROM study_plan_items WHERE id = $1 AND course_id = $2', [int(body.itemId), course.id]);
  if (!item) throw new HttpError(404, 'not_found');
  if (body.done) await q('INSERT INTO study_plan_progress(user_id, item_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [user.id, item.id]);
  else await q('DELETE FROM study_plan_progress WHERE user_id = $1 AND item_id = $2', [user.id, item.id]);
  return json({ ok: true });
});
