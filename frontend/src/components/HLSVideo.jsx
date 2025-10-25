// src/components/HLSVideo.jsx
import { useEffect, useRef } from "react";
import Hls from "hls.js";

export default function HLSVideo({
  src,
  autoPlay = true,
  muted = true,
  playsInline = true,
  loop = true,
  className = "",
  onReady,
}) {
  const ref = useRef(null);
  useEffect(() => {
    const video = ref.current;
    if (!video) return;

    // ensure attributes are set early
    video.muted = muted;
    video.autoplay = autoPlay;
    video.playsInline = playsInline;
    video.loop = false; // we'll handle looping manually for HLS

    const handleEnded = () => {
      if (!loop) return;
      try {
        video.currentTime = 0;
        const p = video.play();
        if (p && typeof p.catch === "function") p.catch(() => {});
      } catch {}
    };
    video.addEventListener("ended", handleEnded);

    // Safari/iOS has native HLS
    if (video.canPlayType("application/vnd.apple.mpegURL")) {
      video.src = src;
      const ready = () => onReady?.();
      video.addEventListener("canplay", ready, { once: true });
      return () => {
        video.removeEventListener("ended", handleEnded);
        video.removeEventListener("canplay", ready);
      };
    }

    // Other browsers use hls.js
    let hls;
    if (Hls.isSupported()) {
      hls = new Hls();
      hls.loadSource(src);
      hls.attachMedia(video);
      const ready = () => onReady?.();
      hls.on(Hls.Events.MANIFEST_PARSED, ready);
    }

    return () => {
      video.removeEventListener("ended", handleEnded);
      if (hls) hls.destroy();
    };
  }, [src, autoPlay, muted, playsInline, loop, onReady]);

  // IMPORTANT: start full-size immediately
  return (
    <video
      ref={ref}
      className={className}
      playsInline={playsInline}
      // controls={false} // keep off unless you need it
    />
  );
}
