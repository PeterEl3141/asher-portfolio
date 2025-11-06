import { useEffect, useRef, useState } from "react";
import HLSVideo from "../components/HLSVideo";

export default function HeroVideo({
  delayMs = 5000,
  maxExtraWaitMs = 4000,
}) {
  const wrapRef = useRef(null);

  const VIDEO_ID = "9c9e402479e9a53c7284089949a5f879";
  const hlsSrc = `https://videodelivery.net/${VIDEO_ID}/manifest/video.m3u8`;

  const [minDelayDone, setMinDelayDone] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [timedOut, setTimedOut] = useState(false);

  // 5s title card + fail-safe
  useEffect(() => {
    const t = setTimeout(() => setMinDelayDone(true), delayMs);
    const fail = setTimeout(() => setTimedOut(true), delayMs + maxExtraWaitMs);
    return () => { clearTimeout(t); clearTimeout(fail); };
  }, [delayMs, maxExtraWaitMs]);

  // Preload HLS manifest
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "fetch";
    link.href = hlsSrc;
    link.crossOrigin = "anonymous";
    document.head.appendChild(link);
    return () => document.head.removeChild(link);
  }, [hlsSrc]);

  const showVideo = minDelayDone && (videoReady || timedOut);

  // Transitions
  const revealFadeMs = 700;  // title-card fade only (no scroll fading)

  // Ring geometry (unchanged)
  const R = 48;
  const C = 2 * Math.PI * R;

  return (
    <section
      id="hero"
      data-hero
      ref={wrapRef}
      className="relative w-screen h-screen overflow-hidden mb-[clamp(2rem,6vw,6rem)]"
    >
      {/* 10px inset frame */}
      <div className="absolute inset-2.5 overflow-hidden ring-1 ring-white/10 z-10">
        {/* Video wrapper (fade in after title card) */}
        <div
          className="absolute inset-0 transition-opacity"
          style={{ opacity: showVideo ? 1 : 0, transitionDuration: `${revealFadeMs}ms` }}
        >
          <HLSVideo
            src={hlsSrc}
            autoPlay
            muted
            playsInline
            loop
            className="absolute inset-0 w-full h-full object-cover"
            onReady={() => setVideoReady(true)}
            onError={() => setTimedOut(true)}
          />
        </div>

        {/* Title card overlay (only before reveal) */}
        <div
          className="absolute inset-0 bg-black flex items-center justify-center"
          style={{
            opacity: showVideo ? 0 : 1,
            transition: `opacity ${revealFadeMs}ms linear`,
            pointerEvents: showVideo ? "none" : "auto",
          }}
          aria-hidden={showVideo}
        >
          {!showVideo && (
            <svg
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[42vw] max-w-[760px] h-auto"
              viewBox="0 0 120 120"
              aria-hidden="true"
              style={{ "--duration": `${delayMs}ms` }}
            >
              <circle cx="60" cy="60" r={R} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />
              <circle
                cx="60" cy="60" r={R} fill="none" stroke="white" strokeWidth="0.5"
                strokeDasharray={C} strokeDashoffset={C} className="progress-ring"
              />
            </svg>
          )}
        </div>

        {/* Logo (constant opacity; no scroll-based fading) */}
        <img
          src="/images/AR.png"
          alt="Director Logo"
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
                     w-[28vw] max-w-[460px] h-auto
                     mix-blend-difference pointer-events-none
                     [filter:contrast(1.4)_saturate(2)_drop-shadow(0_8px_32px_rgba(255,255,255,0.25))]"
          style={{ opacity: 1 }}
          aria-hidden={false}
        />
      </div>

      {/* Fin dock (unchanged) */}
      <div
        id="fin-dock"
        className="pointer-events-none absolute left-0 bottom-0 w-full z-0"
        style={{ height: "200px", background: "transparent" }}
      />
    </section>
  );
}
