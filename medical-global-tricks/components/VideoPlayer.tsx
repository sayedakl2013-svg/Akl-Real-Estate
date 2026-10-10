'use client';
import { useRef, useState } from 'react';
import { Icon } from './Icons';

/** Manual-play video: nothing loads or plays until the viewer presses play. */
export function VideoPlayer({ src, title, playLabel, poster, mime = 'video/mp4' }: { src: string; title: string; playLabel: string; poster?: string; mime?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [started, setStarted] = useState(false);
  return (
    <div className="video-frame">
      <video ref={ref} controls={started} preload="none" playsInline poster={poster} aria-label={title}>
        {started && <source src={src} type={mime} />}
      </video>
      {!started && (
        <button type="button" className="video-poster-btn" onClick={() => {
          setStarted(true);
          requestAnimationFrame(() => { ref.current?.load(); ref.current?.play().catch(() => {}); });
        }}>
          <span><Icon name="play" /> {playLabel}</span>
        </button>
      )}
    </div>
  );
}

export function EmbedPlayer({ type, id, title, playLabel }: { type: 'youtube' | 'vimeo'; id: string; title: string; playLabel: string }) {
  const [started, setStarted] = useState(false);
  const src = type === 'youtube' ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0` : `https://player.vimeo.com/video/${encodeURIComponent(id)}?autoplay=1`;
  return (
    <div className="video-frame" style={{ aspectRatio: '16 / 9' }}>
      {started ? (
        <iframe src={src} title={title} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen style={{ border: 0, width: '100%', height: '100%' }} />
      ) : (
        <button type="button" className="video-poster-btn" onClick={() => setStarted(true)}><span><Icon name="play" /> {playLabel}</span></button>
      )}
    </div>
  );
}
