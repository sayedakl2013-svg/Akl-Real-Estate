import { handler, int, HttpError } from '@/lib/http';
import { requireUser } from '@/lib/auth';
import { courseAccess } from '@/lib/access';
import { one } from '@/lib/db';
import { serveStored } from '@/lib/serve';

type Ctx = { params: Promise<{ id: string }> };

export const GET = handler<Ctx>(async (req, { params }) => {
  const user = await requireUser();
  const f = await one(`SELECT f.*, c.status AS course_status FROM course_files f JOIN courses c ON c.id = f.course_id WHERE f.id = $1`, [int((await params).id)]);
  if (!f) throw new HttpError(404, 'not_found');
  const a = await courseAccess(user, f.course_id);
  if (!a.staff && (!a.active || f.status !== 'published' || f.course_status !== 'available')) throw new HttpError(403, 'no_access');
  return serveStored(req, f.storage_key, 'application/pdf', `${f.title}.pdf`);
});
