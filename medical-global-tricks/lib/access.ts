import 'server-only';
import { notFound, redirect } from 'next/navigation';
import { one, q } from './db';
import { HttpError } from './http';
import { pageUser, type SessionUser } from './auth';

export interface Course {
  id: number; slug: string; title_en: string; title_ar: string; summary_en: string; summary_ar: string;
  country: string; authority: string; track: string; specialty: string; exam_format: string;
  status: 'available' | 'planned' | 'draft' | 'archived'; sort_order: number;
}

export async function courseBySlug(slug: string): Promise<Course | null> {
  return one<Course>('SELECT * FROM courses WHERE slug = $1', [slug]);
}

export interface Access {
  active: boolean;
  staff: boolean;
  enrollment: { id: string; source: string; status: string; expires_at: string | null } | null;
}

/**
 * Read-only access check (hot path: runs on every study request). Expiry is decided by expires_at here;
 * scripts/maintenance.mjs flips lapsed rows to status 'expired' for reporting.
 */
export async function courseAccess(user: SessionUser | null, courseId: number): Promise<Access> {
  if (!user) return { active: false, staff: false, enrollment: null };
  const staff = user.role === 'admin' || user.role === 'editor';
  // 'canceled' subscriptions keep access until the end of the paid period.
  const e = await one(
    `SELECT id, source, status, expires_at FROM enrollments
      WHERE user_id = $1 AND course_id = $2 AND status IN ('active','canceled')
        AND (expires_at IS NULL OR expires_at > now())
      ORDER BY expires_at DESC NULLS FIRST LIMIT 1`,
    [user.id, courseId],
  );
  return { active: staff || !!e, staff, enrollment: e };
}

/** API guard: course must exist, be available (staff may preview drafts) and the user must have access. */
export async function requireCourseAccess(user: SessionUser, courseId: number): Promise<Course> {
  const course = await one<Course>('SELECT * FROM courses WHERE id = $1', [courseId]);
  if (!course) throw new HttpError(404, 'not_found');
  const a = await courseAccess(user, courseId);
  if (!a.active || (course.status !== 'available' && !a.staff)) throw new HttpError(403, 'no_access');
  return course;
}

/** Page guard used by /learn/[slug]/*. */
export async function pageCourseAccess(user: SessionUser, slug: string): Promise<Course> {
  const course = await courseBySlug(slug);
  if (!course) notFound();
  const a = await courseAccess(user, course.id);
  if (!a.active || (course.status !== 'available' && !a.staff)) redirect(`/courses/${slug}?access=required`);
  return course;
}

export async function domainsFor(courseId: number) {
  return q<{ id: number; code: string; name_en: string; name_ar: string; description_en: string; description_ar: string; color: string; total: number }>(
    `SELECT d.id, d.code, d.name_en, d.name_ar, d.description_en, d.description_ar, d.color,
            (SELECT count(*)::int FROM questions qq WHERE qq.domain_id = d.id AND qq.status = 'published') AS total
       FROM domains d WHERE d.course_id = $1 ORDER BY d.sort_order, d.id`,
    [courseId],
  );
}

/** Every /learn page calls this itself: layouts render in parallel with pages, so they cannot be the only guard. */
export async function learnCtx(slug: string) {
  const user = await pageUser(`/learn/${slug}`);
  const course = await pageCourseAccess(user, slug);
  return { user, course };
}
