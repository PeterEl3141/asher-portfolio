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

  const preventTouchRef = useRef(null);
  if (!preventTouchRef.current) {
    preventTouchRef.current = (e) => e.preventDefault();
  }

  // enforce the minimum loading ring + max extra wait
  useEffect(() => {
    const t = setTimeout(() => setMinDelayDone(true), delayMs);
    const fail = setTimeout(
      () => setTimedOut(true),
      delayMs + maxExtraWaitMs
    );
    return () => {
      clearTimeout(t);
      clearTimeout(fail);
    };
  }, [delayMs, maxExtraWaitMs]);

  // drive the SVG ring duration
  useEffect(() => {
    if (ringRef.current) {
      ringRef.current.style.setProperty("--duration", `${delayMs}ms`);
    }
  }, [delayMs]);

  const showVideo = minDelayDone && (videoReady || timedOut);

 useEffect(() => {
  const preventTouch = preventTouchRef.current;
  let scrollY = 0;

  if (!showVideo) {
    scrollY = window.scrollY;

    document.body.dataset.heroLoading = "true";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";

    document.addEventListener("touchmove", preventTouch, { passive: false });
  } else {
  const y = Math.abs(parseInt(document.body.style.top || "0", 10));

  // UNLOCK SCROLL (belt + suspenders)
  delete document.body.dataset.heroLoading;
  document.body.removeAttribute("data-hero-loading");

  document.body.style.position = "";
  document.body.style.top = "";
  document.body.style.width = "";

  document.removeEventListener("touchmove", preventTouch);

  window.scrollTo(0, y);

  // ✅ force listeners (your parallax) to recompute immediately
  requestAnimationFrame(() => {
    window.dispatchEvent(new Event("scroll"));
    window.dispatchEvent(new Event("resize"));
  });

  // Refresh GSAP / ScrollTrigger after layout settles
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      try {
        window.ScrollTrigger?.refresh?.();
      } catch {}
    })
  );
}


  return () => {
    delete document.body.dataset.heroLoading;
    document.body.removeAttribute("data-hero-loading");
    document.body.style.position = "";
    document.body.style.top = "";
    document.body.style.width = "";
    document.removeEventListener("touchmove", preventTouch);
  };
}, [showVideo]);




  const R = 48;
  const C = 2 * Math.PI * R;

  /* ---- NEW: pause hero video once it's off-screen to free resources ---- */
  useEffect(() => {
    const section = wrapRef.current;
    const video = videoRef.current;
    if (!section || !video) return;

    // Safari supports IO, but guard just in case
    if (typeof IntersectionObserver === "undefined") {
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.target !== section) continue;

          // If the hero is in view at all, make sure it's playing
          if (entry.isIntersecting) {
            try {
              const p = video.play();
              if (p && typeof p.catch === "function") p.catch(() => {});
            } catch {
              // ignore autoplay issues
            }
          } else {
            // Completely out of view: pause it
            try {
              video.pause();
            } catch {
              // ignore
            }
          }
        }
      },
      {
        // Consider it "visible" as long as any part of it is in view
        threshold: 0,
      }
    );

    io.observe(section);
    return () => io.disconnect();
  }, []);

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
