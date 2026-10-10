import { handler, json, int, readJson, HttpError } from '@/lib/http';
import { requireUser } from '@/lib/auth';
import { requireCourseAccess } from '@/lib/access';
import { rateQuestion } from '@/lib/study';

type Ctx = { params: Promise<{ id: string }> };

export const POST = handler<Ctx>(async (req, { params }) => {
  const user = await requireUser();
  const course = await requireCourseAccess(user, int((await params).id));
  const body = await readJson(req);
  if (body.rating !== 'recalled' && body.rating !== 'review') throw new HttpError(400, 'bad_rating');
  await rateQuestion(user.id, course.id, int(body.questionId), body.rating, 'practice');
  return json({ ok: true });
});
