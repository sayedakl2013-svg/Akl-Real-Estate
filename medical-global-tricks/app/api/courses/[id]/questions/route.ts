import { handler, json, int, str } from '@/lib/http';
import { requireUser } from '@/lib/auth';
import { requireCourseAccess } from '@/lib/access';
import { searchQuestions } from '@/lib/study';

type Ctx = { params: Promise<{ id: string }> };

export const GET = handler<Ctx>(async (req, { params }) => {
  const user = await requireUser();
  const course = await requireCourseAccess(user, int((await params).id));
  const sp = req.nextUrl.searchParams;
  const res = await searchQuestions(user.id, course.id, {
    domainId: int(sp.get('domain')) || undefined, text: str(sp.get('q'), 100) || undefined,
    filter: str(sp.get('filter'), 20) || undefined, offset: int(sp.get('offset')), limit: int(sp.get('limit'), 30),
  });
  return json(res);
});
