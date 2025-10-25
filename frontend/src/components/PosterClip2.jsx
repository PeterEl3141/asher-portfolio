import './PosterClip.css'

export default function PosterClip2({ posterSrc, videoSrc, title, posterW='min(86vw, 820px)', videoW='min(68vw, 680px)', front='video', anchor='br', offset='10%', safeTop=true, align='center' }) {
    const alignClass = { left: 'place-items-start', center: 'place-items-center', right: 'place-items-end' }[align] ?? 'place-items-center';
    return (
      <section className={`relative isolate my-16 grid ${alignClass} ${safeTop ? 'pt-32 md:pt-48' : ''}`}>
        <div className="relative">
          {/* Poster (back) */}
          <img
            src={posterSrc}
            alt={title || 'Poster'}
            className="block shadow-2xl ring-1 ring-white/10"
            style={{ width: `clamp(260px, ${posterW}, 800px)` }}
          />
  
          {/* Trailer (front), diagonally offset from poster’s bottom-right */}
          <div
            className="absolute bottom-[10%] right-[10%] -translate-x-full -translate-y-full
                        overflow-hidden ring-1 ring-white/15 shadow-2xl bg-black/60"
            style={{ width: `clamp(220px, ${videoW}, 720px)` }}
          >
            <div className="aspect-video">
              <video
                className="w-full h-full object-cover"
                src={videoSrc}
                autoPlay
                muted
                loop
                playsInline
                controls
              />
            </div>
          </div>
        </div>
  
        {title && (
          <div className="mt-6 text-white/80 tracking-wide">{title}</div>
        )}
      </section>
    );
  }
  