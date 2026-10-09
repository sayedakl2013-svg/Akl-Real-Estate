import { learnCtx } from '@/lib/access';
import { getT } from '@/lib/i18n';
import { q } from '@/lib/db';
import { StudyPlan } from '@/components/StudyPlan';

export const dynamic = 'force-dynamic';

export default async function Plan({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { user, course } = await learnCtx(slug);
  const { t } = await getT();
  const items = await q(`SELECT i.id, i.week, i.title_en, i.title_ar, (p.item_id IS NOT NULL) AS done
    FROM study_plan_items i LEFT JOIN study_plan_progress p ON p.item_id = i.id AND p.user_id = $1
    WHERE i.course_id = $2 ORDER BY i.week, i.sort_order, i.id`, [user.id, course.id]);
  return <div className="stack"><h2>{t.learn.plan}</h2><StudyPlan courseId={course.id} items={items as any} /></div>;
}
