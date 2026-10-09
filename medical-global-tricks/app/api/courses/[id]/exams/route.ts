import { handler, json, int, readJson, HttpError } from '@/lib/http';
import { requireUser } from '@/lib/auth';
import { requireCourseAccess } from '@/lib/access';
import { createAttempt } from '@/lib/study';
import { rateLimit } from '@/lib/ratelimit';

type Ctx = { params: Promise<{ id: string }> };

export const POST = handler<Ctx>(async (req, { params }) => {
  const user = await requireUser();
  const course = await requireCourseAccess(user, int((await params).id));
  await rateLimit(`exam-start:${user.id}`, 30, 3600);
  const body = await readJson(req);
  const mode = ['domain', 'mixed', 'review'].includes(body.mode) ? body.mode : null;
  if (!mode) throw new HttpError(400, 'bad_mode');
  const r = await createAttempt(user.id, course.id, { mode, domainId: int(body.domainId) || undefined, count: int(body.count, 10), minutes: int(body.minutes, 20) });
  return json(r);
});
