import { notFound, redirect } from 'next/navigation';
import { domainsFor, learnCtx } from '@/lib/access';
import { getAttempt } from '@/lib/study';
import { ExamRunner } from '@/components/ExamRunner';

export const dynamic = 'force-dynamic';

export default async function Attempt({ params }: { params: Promise<{ slug: string; attemptId: string }> }) {
  const { slug, attemptId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(attemptId)) notFound();
  const { user, course } = await learnCtx(slug);
  const data = await getAttempt(user.id, attemptId);
  if (!data || data.attempt.course_id !== course.id) notFound();
  if (data.attempt.status !== 'in_progress') redirect(`/learn/${slug}/exams/${attemptId}/result`);
  const domains = await domainsFor(course.id);
  return <ExamRunner attemptId={attemptId} slug={slug} secondsLeft={Math.max(0, data.attempt.seconds_left)} items={data.items as any} domains={domains} />;
}
