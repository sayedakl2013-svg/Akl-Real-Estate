import 'server-only';
import { q } from './db';
import type { Course } from './access';

export type CourseRow = Course & { question_count: number; domain_count: number };

export async function listCourses(filters: { country?: string; authority?: string; track?: string; specialty?: string; status?: string; q?: string } = {}, includeHidden = false) {
  const where: string[] = [includeHidden ? 'true' : `c.status IN ('available','planned')`];
  const params: unknown[] = [];
  for (const k of ['country', 'authority', 'track', 'specialty', 'status'] as const) {
    if (filters[k]) { params.push(filters[k]); where.push(`c.${k} = $${params.length}`); }
  }
  if (filters.q) { params.push(`%${filters.q}%`); where.push(`(c.title_en ILIKE $${params.length} OR c.title_ar ILIKE $${params.length} OR c.specialty ILIKE $${params.length})`); }
  return q<CourseRow>(
    `SELECT c.*,
       (SELECT count(*)::int FROM questions x WHERE x.course_id = c.id AND x.status = 'published') AS question_count,
       (SELECT count(*)::int FROM domains d WHERE d.course_id = c.id) AS domain_count
       FROM courses c WHERE ${where.join(' AND ')}
      ORDER BY CASE c.status WHEN 'available' THEN 0 WHEN 'planned' THEN 1 ELSE 2 END, c.sort_order, c.id`,
    params,
  );
}

export async function facetValues() {
  const rows = await q<{ country: string; authority: string; track: string; specialty: string }>(
    `SELECT DISTINCT country, authority, track, specialty FROM courses WHERE status IN ('available','planned')`);
  const uniq = (k: keyof (typeof rows)[number]) => [...new Set(rows.map((r) => r[k]))].sort();
  return { country: uniq('country'), authority: uniq('authority'), track: uniq('track'), specialty: uniq('specialty') };
}

export async function activeOffers(courseId: number) {
  return q<{ id: number; kind: 'one_time' | 'subscription'; label_en: string; label_ar: string; currency: string; amount_minor: number; access_days: number | null; interval: string | null; interval_count: number }>(
    'SELECT * FROM course_offers WHERE course_id = $1 AND active ORDER BY amount_minor', [courseId]);
}

export const paymentsEnabled = () => !!(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET);

export function formatMoney(minor: number, currency: string, lang: 'en' | 'ar') {
  try {
    return new Intl.NumberFormat(lang === 'ar' ? 'ar-AE' : 'en-AE', { style: 'currency', currency: currency.toUpperCase() }).format(minor / 100);
  } catch {
    return `${(minor / 100).toFixed(2)} ${currency.toUpperCase()}`;
  }
}
