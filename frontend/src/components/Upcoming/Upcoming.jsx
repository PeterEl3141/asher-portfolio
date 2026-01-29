import React, { useEffect, useRef } from "react";
import Hls from "hls.js";
import { useInView } from "../../hooks/useInView"; // adjust path if needed
import "./Upcoming.css";

const VIDEO_ID = "c049d08d9ed0cf843851dab095d0fc10";
const hlsSrc = (id) => `https://videodelivery.net/${id}/manifest/video.m3u8`;

export default function Upcoming() {
  const sectionRef = useRef(null);
  const heroWordRef = useRef(null); // parallax word
  const videoRef = useRef(null);

  // HLS + loop helpers (persist across renders)
  const hlsRef = useRef(null);
  const vodDurationRef = useRef(NaN);
  const hbRef = useRef(null);
  const lastCTRef = useRef(0);

  const src = hlsSrc(VIDEO_ID);

  // Active only when in view (pause once outside viewport)
  const inView = useInView(sectionRef, {
    rootMargin: "0px 0px 0px 0px",
    threshold: 0.0, // any pixel visible
  });
  const active = inView;

  /* ---------------- Parallax for the massive "UPCOMING" word ---------------- */
  useEffect(() => {
    const section = sectionRef.current;
    const word = heroWordRef.current;
    if (!section || !word) return;

    const factor = 0.5;
    let ticking = false;

    const update = () => {
      const rect = section.getBoundingClientRect();
      const visible = rect.top < window.innerHeight && rect.bottom > 0;
      if (!visible) {
        ticking = false;
        return;
      }

      const delta = -rect.top;
      const y = delta * factor;

      word.style.transform = `translate3d(-50%, ${y}px, 0)`;
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(update);
      }
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  /* ---------------------- Preload HLS manifest only when active ------------- */
  useEffect(() => {
    if (!src || !active) return;
    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "fetch";
    link.href = src;
    link.crossOrigin = "anonymous";
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
    };
  }, [src, active]);

  /* -------------------- Build HLS pipeline ONCE (per src) ------------------- */
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    // Base video attributes
    video.playsInline = true;
    video.muted = true;
    video.autoplay = true;
    video.crossOrigin = "anonymous";
    video.preload = "auto";
    video.loop = false; // we manage looping ourselves

    const seekableStart = () => {
      const s = video.seekable;
      if (s && s.length) {
        try {
          return s.start(0);
        } catch {}
      }
      const b = video.buffered;
      if (b && b.length) {
        try {
          return b.start(0);
        } catch {}
      }
      return 0;
    };

    const restartFromStart = () => {
      try {
        const start = seekableStart() + 0.03;

        const hls = hlsRef.current;
        if (hls) {
          try {
            hls.stopLoad();
          } catch {}
          try {
            hls.startLoad(0);
          } catch {}
        } else {
          // Native fallback: src flush ONLY for looping at end
          const cur = video.src;
          try {
            video.src = "";
          } catch {}
          setTimeout(() => {
            try {
              video.src = cur;
            } catch {}
          }, 0);
        }

        try {
          video.currentTime = start;
        } catch {}

        const p = video.play();
        if (p && typeof p.catch === "function") p.catch(() => {});
      } catch {}
    };

    const nearEnd = () => {
      const d = vodDurationRef.current;
      if (Number.isFinite(d) && d > 0) {
        return d - video.currentTime <= 0.6;
      }
      // fallback if duration unknown
      if (Number.isFinite(video.duration) && video.duration > 0) {
        return video.duration - video.currentTime <= 0.6;
      }
      return false;
    };

    const onTimeupdate = () => {
      if (!active) return; // only enforce loop while active
      if (nearEnd()) restartFromStart();
    };

    const startHeartbeat = () => {
      if (hbRef.current) return;
      hbRef.current = setInterval(() => {
        if (!active) return;

        const notAdvancing =
          Math.abs(video.currentTime - lastCTRef.current) < 0.01;
        lastCTRef.current = video.currentTime;

        if (nearEnd() || video.ended || (notAdvancing && video.currentTime > 0.5 && video.readyState >= 2)) {
          restartFromStart();
        }
      }, 350);
    };

    const stopHeartbeat = () => {
      if (hbRef.current) {
        clearInterval(hbRef.current);
        hbRef.current = null;
      }
    };

    video.addEventListener("timeupdate", onTimeupdate);

    // Build pipeline (hls.js preferred, else native)
    if (Hls.isSupported()) {
      const hls = new Hls({ autoStartLoad: false, lowLatencyMode: true });
      hlsRef.current = hls;

      hls.attachMedia(video);
      hls.on(Hls.Events.MEDIA_ATTACHED, () => {
        hls.loadSource(src);
        // only load/play once active
        if (active) {
          try {
            hls.startLoad(0);
          } catch {}
        }
      });

      hls.on(Hls.Events.LEVEL_LOADED, (_evt, data) => {
        const det = data?.details;
        if (det && det.live === false && Number.isFinite(det.totalduration)) {
          vodDurationRef.current = det.totalduration;
        }
      });

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        startHeartbeat();
        if (active) {
          const p = video.play();
          if (p && typeof p.catch === "function") p.catch(() => {});
        }
      });

      hls.on(Hls.Events.ERROR, (_evt, data) => {
        if (data?.fatal) {
          // Keep it simple: tear down on fatal
          try {
            hls.destroy();
          } catch {}
          hlsRef.current = null;
        }
      });
    } else {
      // Native HLS (Safari)
      video.src = src;
      video.addEventListener(
        "loadedmetadata",
        () => {
          startHeartbeat();
          if (active) {
            const p = video.play();
            if (p && typeof p.catch === "function") p.catch(() => {});
          }
        },
        { once: true }
      );
    }

    return () => {
      try {
        video.removeEventListener("timeupdate", onTimeupdate);
      } catch {}
      stopHeartbeat();
      try {
        hlsRef.current?.destroy?.();
      } catch {}
      hlsRef.current = null;
      try {
        video.pause?.();
      } catch {}
      // IMPORTANT: do NOT clear src here — we want to keep last frame behavior stable
      // try { video.src = ""; } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]); // ✅ build once per src

  /* ---------------- Pause/resume on visibility ------------------------------ */
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (!active) {
      try {
        video.pause();
      } catch {}
      try {
        hlsRef.current?.stopLoad?.();
      } catch {}
      return;
    }

    try {
      hlsRef.current?.startLoad?.(0);
    } catch {}
    try {
      const p = video.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
    } catch {}
  }, [active]);

  /* --------------------------------------------------------------------- */

  return (
    <section className="upcoming-section" ref={sectionRef}>
      {/* Massive background word with parallax */}
      <div ref={heroWordRef} className="upcoming-hero-word" aria-hidden>
        UPCOMING
      </div>

      {/* Big central visual (poster image) */}
      <div className="upcoming-main">
        <img
          src="/images/smallgods.png"
          alt="Upcoming — trailer artwork"
          className="upcoming-main-img"
        />
      </div>

      {/* Video directly underneath the image */}
      <div className="upcoming-video-wrap">
        <video ref={videoRef} className="upcoming-video" muted playsInline />
      </div>
    </section>
  );
}
