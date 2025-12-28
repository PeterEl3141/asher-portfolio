// src/components/HLSVideo.jsx
import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";

export default function HLSVideo({
  src,
  autoPlay = true,
  muted = true,
  playsInline = true,
  loop = true,
  className = "",
  onReady,
  eager = false,          // NEW: skip IO and load immediately
}) {
  const ref = useRef(null);
  const hlsRef = useRef(null);
  const [shouldPlay, setShouldPlay] = useState(eager);

  /* ------------ Visibility / prewarm control (IntersectionObserver) --------- */
  useEffect(() => {
    const video = ref.current;
    if (!video) return;

    // If this clip is marked eager, we never use the observer
    if (eager) {
      setShouldPlay(true);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const ratio = entry.intersectionRatio;

          // Start warming when at least ~20–25% visible
          if (ratio >= 0.25) {
            setShouldPlay(true);
          }
          // Only tear down once it's basically gone
          else if (ratio <= 0.05) {
            setShouldPlay(false);
          }
        });
      },
      {
        // Start work a bit before it hits the viewport, and keep it alive
        // slightly past the edges.
        root: null,
        rootMargin: "200px 0px 200px 0px",
        threshold: [0, 0.05, 0.25],
      }
    );

    io.observe(video);
    return () => io.disconnect();
  }, [eager]);

  /* ----------------------- HLS / video pipeline ----------------------------- */
  useEffect(() => {
    const video = ref.current;
    if (!video || !src) return;

    // If we shouldn't be active (yet), just make sure previous pipeline is gone.
    if (!shouldPlay) {
      if (hlsRef.current) {
        try {
          hlsRef.current.destroy();
        } catch {}
        hlsRef.current = null;
      }
      // Don't blank src here; keep poster / last frame visible
      return;
    }

    // Ensure attributes are set early
    video.muted = muted;
    video.autoplay = autoPlay;
    video.playsInline = playsInline;
    video.loop = false; // we handle looping manually

    const handleEnded = () => {
      if (!loop) return;
      try {
        video.currentTime = 0;
        const p = video.play();
        if (p && typeof p.catch === "function") p.catch(() => {});
      } catch {}
    };
    video.addEventListener("ended", handleEnded);

    let cancelled = false;

    // Safari / iOS – native HLS
    if (video.canPlayType("application/vnd.apple.mpegURL")) {
      video.src = src;

      const ready = () => {
        if (cancelled) return;
        onReady?.();
        if (autoPlay) {
          const p = video.play();
          if (p && typeof p.catch === "function") p.catch(() => {});
        }
      };

      video.addEventListener("canplay", ready, { once: true });

      return () => {
        cancelled = true;
        video.removeEventListener("ended", handleEnded);
        video.removeEventListener("canplay", ready);
      };
    }

    // Other browsers – hls.js
    if (Hls.isSupported()) {
      const hls = new Hls({
        autoStartLoad: true,
        lowLatencyMode: true,
      });
      hlsRef.current = hls;

      const ready = () => {
        if (cancelled) return;
        onReady?.();
        if (autoPlay) {
          const p = video.play();
          if (p && typeof p.catch === "function") p.catch(() => {});
        }
      };

      hls.attachMedia(video);
      hls.on(Hls.Events.MEDIA_ATTACHED, () => hls.loadSource(src));
      hls.on(Hls.Events.MANIFEST_PARSED, ready);
      hls.on(Hls.Events.ERROR, (_evt, data) => {
        if (data?.fatal && !cancelled) {
          try {
            hls.destroy();
          } catch {}
          hlsRef.current = null;
        }
      });

      return () => {
        cancelled = true;
        video.removeEventListener("ended", handleEnded);
        try {
          hls.destroy();
        } catch {}
        hlsRef.current = null;
      };
    }

    // Fallback: direct MP4 or unsupported HLS
    video.src = src;
    const ready = () => {
      if (cancelled) return;
      onReady?.();
      if (autoPlay) {
        const p = video.play();
        if (p && typeof p.catch === "function") p.catch(() => {});
      }
    };
    video.addEventListener("canplay", ready, { once: true });

    return () => {
      cancelled = true;
      video.removeEventListener("ended", handleEnded);
      video.removeEventListener("canplay", ready);
    };
  }, [src, autoPlay, muted, playsInline, loop, onReady, shouldPlay]);

  return (
    <video
      ref={ref}
      className={className}
      playsInline={playsInline}
    />
  );
}
