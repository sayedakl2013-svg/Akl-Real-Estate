import { handler, json, HttpError } from '@/lib/http';
import { requireUser } from '@/lib/auth';
import { submitAttempt } from '@/lib/study';

type Ctx = { params: Promise<{ attemptId: string }> };

export const POST = handler<Ctx>(async (_req, { params }) => {
  const user = await requireUser();
  const { attemptId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(attemptId)) throw new HttpError(404, 'not_found');
  return json(await submitAttempt(user.id, attemptId));
});
