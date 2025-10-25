// PosterClip1.jsx
import { useRef, useEffect } from 'react';
import { useInView } from '../hooks/useInView';
import './PosterClip1.css';

export default function PosterClip1({
  posterSrc,
  videoSrc,
  title,
  tileW = 220,
  ratio = 1.5,     // width/height of each poster tile (e.g. 0.6–0.67)
  height = '90vh', // total section height
}) {
  const wrapRef = useRef(null);
  const videoRef = useRef(null);
  const inView = useInView(wrapRef, { threshold: 0.25 });

  // Only attach/play video while in view
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (inView) {
      if (!v.src) v.src = videoSrc;
      v.play().catch(() => {});
    } else {
      try { v.pause(); } catch {}
      v.removeAttribute('src');
      v.load();
    }
  }, [inView, videoSrc]);

  return (
    <section
      ref={wrapRef}
      className="poster-clip"
      style={{
        '--section-h': height,
        '--poster': `url(${posterSrc})`,
        '--tile-w': `${tileW}px`,
        '--ratio': ratio,
      }}
    >
      <div className="poster-clip__bg" aria-hidden="true" />
      <div className="poster-clip__vignette" aria-hidden="true" />

      <div className="poster-clip__inner">
        <div className="poster-clip__frame">
          <video
            ref={videoRef}
            className="poster-clip__video"
            muted
            loop
            playsInline
            preload="none"
            controls
            disablePictureInPicture
            controlsList="nodownload"
          />
        </div>

        {title && <div className="poster-clip__title">{title}</div>}
      </div>
    </section>
  );
}
