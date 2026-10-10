import { handler, json, int, readJson } from '@/lib/http';
import { requireUser } from '@/lib/auth';
import { requireCourseAccess } from '@/lib/access';
import { setBookmark } from '@/lib/study';

type Ctx = { params: Promise<{ id: string }> };

export const POST = handler<Ctx>(async (req, { params }) => {
  const user = await requireUser();
  const course = await requireCourseAccess(user, int((await params).id));
  const body = await readJson(req);
  await setBookmark(user.id, course.id, int(body.questionId), !!body.saved);
  return json({ ok: true });
});
