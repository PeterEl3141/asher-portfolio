import { useEffect, useRef, useState } from "react";
import "./HeroVideo.css";

export default function HeroVideo({
  delayMs = 5000,
  maxExtraWaitMs = 4000,
}) {
  const wrapRef = useRef(null);
  const ringRef = useRef(null);
  const videoRef = useRef(null);

  const HERO_SRC = "/videos/hero.mp4"; // <-- in public/videos/hero.mp4

  const [minDelayDone, setMinDelayDone] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [timedOut, setTimedOut] = useState(false);

  const revealFadeMs = 700;

  useEffect(() => {
    const t = setTimeout(() => setMinDelayDone(true), delayMs);
    const fail = setTimeout(() => setTimedOut(true), delayMs + maxExtraWaitMs);
    return () => { clearTimeout(t); clearTimeout(fail); };
  }, [delayMs, maxExtraWaitMs]);

  // no HLS manifest preload needed anymore

  useEffect(() => {
    if (ringRef.current) {
      ringRef.current.style.setProperty("--duration", `${delayMs}ms`);
    }
  }, [delayMs]);

  const showVideo = minDelayDone && (videoReady || timedOut);

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
      <div className="hero__frame">
        <div className={`hero__videoWrap ${showVideo ? "is-visible" : ""}`}>
          <video
            ref={videoRef}
            src={HERO_SRC}
            className="hero__video"
            autoPlay
            muted
            playsInline
            loop
            preload="auto"
            onCanPlay={() => setVideoReady(true)}
            // onError={() => setTimedOut(true)} // optional
          />
        </div>

        <div
          className={`hero__title ${showVideo ? "is-hidden" : ""}`}
          aria-hidden={showVideo}
        >
          {!showVideo && (
            <svg
              ref={ringRef}
              className="hero__ring"
              viewBox="0 0 120 120"
              aria-hidden="true"
            >
              <circle
                cx="60"
                cy="60"
                r={R}
                fill="none"
                stroke="rgba(255,255,255,0.15)"
                strokeWidth="0.5"
              />
              <circle
                cx="60"
                cy="60"
                r={R}
                fill="none"
                stroke="white"
                strokeWidth="0.5"
                strokeDasharray={C}
                strokeDashoffset={C}
                className="progress-ring"
              />
            </svg>
          )}
        </div>

        <img
          src="/images/AR.png"
          alt="Director Logo"
          className="hero__logo"
          aria-hidden={false}
        />
      </div>

      <div id="fin-dock" className="hero__dock" />
    </section>
  );
}
