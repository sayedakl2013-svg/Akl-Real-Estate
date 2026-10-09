import { handler, int, HttpError } from '@/lib/http';
import { getUser } from '@/lib/auth';
import { courseAccess } from '@/lib/access';
import { one } from '@/lib/db';
import { serveStored } from '@/lib/serve';

type Ctx = { params: Promise<{ id: string }> };

export const GET = handler<Ctx>(async (req, { params }) => {
  const v = await one(`SELECT * FROM videos WHERE id = $1 AND source_type = 'file'`, [int((await params).id)]);
  if (!v) throw new HttpError(404, 'not_found');
  const user = await getUser();
  const isStaff = user && user.role !== 'student';
  if (!isStaff) {
    if (v.status !== 'published') throw new HttpError(404, 'not_found');
    if (v.access !== 'public') {
      if (!user || !v.course_id || !(await courseAccess(user, v.course_id)).active) throw new HttpError(403, 'no_access');
    }
  }
  return serveStored(req, v.storage_key, v.mime ?? 'video/mp4', `video-${v.id}.mp4`);
});
