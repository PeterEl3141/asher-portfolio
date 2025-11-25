import { useEffect, useRef, useState } from "react";
import HLSVideo from "../HLSVideo";
import "./HeroVideo.css";

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

  // reveal only controls (no scroll fading)
  const revealFadeMs = 700; // ms

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

  // Ring geometry (unchanged)
  const R = 48;
  const C = 2 * Math.PI * R;

  return (
    <section
      id="hero"
      data-hero
      ref={wrapRef}
      className="hero"
      style={{ "--revealMs": `${revealFadeMs}ms` }}
    >
      {/* 10px inset frame */}
      <div className="hero__frame">
        {/* Video wrapper (fade in after title card) */}
        <div className={`hero__videoWrap ${showVideo ? "is-visible" : ""}`}>
          <HLSVideo
            src={hlsSrc}
            autoPlay
            muted
            playsInline
            loop
            className="hero__video"
            onReady={() => setVideoReady(true)}
            onError={() => setTimedOut(true)}
          />
        </div>

        {/* Title card overlay (only before reveal) */}
        <div
          className={`hero__title ${showVideo ? "is-hidden" : ""}`}
          aria-hidden={showVideo}
        >
          {!showVideo && (
            <svg
              className="hero__ring"
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
          className="hero__logo"
          aria-hidden={false}
        />
      </div>

      {/* Fin dock (keep height in sync with your divider height as needed) */}
      <div id="fin-dock" className="hero__dock" />
    </section>
  );
}
