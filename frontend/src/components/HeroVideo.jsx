import { useEffect, useRef, useState } from "react";
import HLSVideo from "../components/HLSVideo";

export default function HeroVideo({
  delayMs = 5000,
  maxExtraWaitMs = 4000,
  // Gradual fade controls:
  fadeStartRatio = 0.98,  // begin fade once below this ratio
  fadeEndRatio   = 0.60,  // fully black by this ratio
}) {
  const wrapRef = useRef(null);

  const VIDEO_ID = "9c9e402479e9a53c7284089949a5f879";
  const hlsSrc = `https://videodelivery.net/${VIDEO_ID}/manifest/video.m3u8`;

  const [minDelayDone, setMinDelayDone] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [timedOut, setTimedOut] = useState(false);

  // Intersection state
  const [ratio, setRatio] = useState(1);
  const [armed, setArmed] = useState(false);     // only fade after we've been fully visible once
  const [maxRatio, setMaxRatio] = useState(0);   // best ratio seen since reveal

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

  // Observe intersection ratio
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const thresholds = Array.from({ length: 101 }, (_, i) => i / 100);
    const io = new IntersectionObserver(([entry]) => {
      const r = entry?.intersectionRatio ?? 0;
      setRatio(r);
    }, { threshold: thresholds });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Arm fading only after reveal AND after we've been (almost) fully visible once
  useEffect(() => {
    if (!showVideo) {
      setArmed(false);
      setMaxRatio(0);
      return;
    }
    setMaxRatio((m) => Math.max(m, ratio));
    const armAt = Math.min(fadeStartRatio, 0.995); // be tolerant of top-of-page quirks
    if (ratio >= armAt || maxRatio >= armAt) setArmed(true);
  }, [showVideo, ratio, fadeStartRatio, maxRatio]);

  // Map current ratio to fade amount (0..1), but only after armed
  const clamp01 = (v) => Math.max(0, Math.min(1, v));
  const startR = Math.max(0, Math.min(1, maxRatio || fadeStartRatio, fadeStartRatio));
  let fadeT = 0;
  if (showVideo && armed) {
    if (ratio >= startR) fadeT = 0;
    else if (ratio <= fadeEndRatio) fadeT = 1;
    else fadeT = (startR - ratio) / (startR - fadeEndRatio);
    fadeT = clamp01(fadeT);
  }

  // Opacities
  const sectionBlackOpacity = showVideo ? fadeT : 0; // covers whole section (incl. fin dock)
  const titleCardOpacity    = showVideo ? 0 : 1;     // inner overlay during initial delay
  const logoOpacity         = showVideo ? (1 - fadeT) : 1;

  // Transitions
  const scrollFadeMs = 140;  // small; smooth while scrolling
  const revealFadeMs = 700;  // title-card fade

  // Ring geometry
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
            opacity: titleCardOpacity,
            transition: `opacity ${revealFadeMs}ms linear`,
            pointerEvents: titleCardOpacity > 0.02 ? "auto" : "none",
          }}
          aria-hidden={titleCardOpacity === 0}
        >
          {!showVideo && (
            <svg
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[42vw] max-w-[760px] h-auto"
              viewBox="0 0 120 120"
              aria-hidden="true"
              style={{ "--duration": `${delayMs}ms` }}
            >
              <circle cx="60" cy="60" r={R} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="2.5" />
              <circle
                cx="60" cy="60" r={R} fill="none" stroke="white" strokeWidth="3.5"
                strokeDasharray={C} strokeDashoffset={C} className="progress-ring"
              />
            </svg>
          )}
        </div>

        {/* Logo fades proportionally when leaving */}
        <img
          src="/images/AR.png"
          alt="Director Logo"
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
                     w-[28vw] max-w-[460px] h-auto
                     mix-blend-difference pointer-events-none
                     [filter:contrast(1.4)_saturate(2)_drop-shadow(0_8px_32px_rgba(255,255,255,0.25))]"
          style={{
            opacity: logoOpacity,
            transition: `opacity ${scrollFadeMs}ms linear`,
          }}
          aria-hidden={logoOpacity === 0}
        />
      </div>

      {/* Section-wide overlay (covers EVERYTHING, incl. fin dock).
          Invisible until we've revealed AND been fully visible once. */}
      <div
        className="absolute inset-0 bg-black pointer-events-none z-20"
        style={{
          opacity: sectionBlackOpacity,
          transition: `opacity ${scrollFadeMs}ms linear`,
        }}
        aria-hidden={sectionBlackOpacity === 0}
      />

      {/* Fin dock (unchanged) */}
      <div
        id="fin-dock"
        className="pointer-events-none absolute left-0 bottom-0 w-full z-0"
        style={{ height: "200px", background: "transparent" }}
      />
    </section>
  );
}
