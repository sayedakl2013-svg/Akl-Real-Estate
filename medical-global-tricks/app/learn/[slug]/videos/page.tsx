import { learnCtx } from '@/lib/access';
import { getT, pick } from '@/lib/i18n';
import { q } from '@/lib/db';
import { VideoPlayer, EmbedPlayer } from '@/components/VideoPlayer';

export const dynamic = 'force-dynamic';

export default async function Videos({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { course } = await learnCtx(slug);
  const { t, lang } = await getT();
  const videos = await q(`SELECT * FROM videos WHERE course_id = $1 AND status = 'published' ORDER BY sort_order, id`, [course.id]);
  return (
    <div className="stack">
      <h2>{t.learn.videos}</h2>
      <p className="muted">{t.videos.intro}</p>
      {videos.length === 0 ? <div className="alert alert-info">{t.videos.none}</div> : (
        <div className="grid grid-2">
          {videos.map((v) => {
            const title = pick(lang, v.title_en, v.title_ar);
            return (
              <div key={v.id} className="card stack">
                <h3 style={{ margin: 0 }}>{title}</h3>
                {v.source_type === 'file'
                  ? <VideoPlayer src={`/api/videos/${v.id}`} mime={v.mime ?? 'video/mp4'} title={title} playLabel={t.teaser.play} />
                  : <EmbedPlayer type={v.source_type} id={v.external_id} title={title} playLabel={t.teaser.play} />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
