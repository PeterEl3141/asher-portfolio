import React, { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import "./Upcoming.css";

const VIDEO_ID = "c049d08d9ed0cf843851dab095d0fc10";
const hlsSrc = (id) => `https://videodelivery.net/${id}/manifest/video.m3u8`;

export default function Upcoming() {
  const sectionRef = useRef(null);
  const heroWordRef = useRef(null); // NEW: ref for the parallax word
  const videoRef = useRef(null);

  const src = hlsSrc(VIDEO_ID);

  /* ---------------- Parallax for the massive "UPCOMING" word ---------------- */
  useEffect(() => {
    const section = sectionRef.current;
    const word = heroWordRef.current;
    if (!section || !word) return;

    const factor = 0.5; // slightly slower so it stays visible longer
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

      // Directly mutate the transform for smoother performance (no React re-renders)
      word.style.transform = `translate3d(-50%, ${y}px, 0)`;
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(update);
      }
    };

    // Initialize once in case we're already scrolled
    update();

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  /* ---------------------- Preload HLS manifest (like VideoP) ----------------- */
  useEffect(() => {
    if (!src) return;
    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "fetch";
    link.href = src;
    link.crossOrigin = "anonymous";
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
    };
  }, [src]);

  /* ----------------------- Robust looping with Hls.js ------------------------ */
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    video.playsInline = true;
    video.muted = true;
    video.autoplay = true;
    video.crossOrigin = "anonymous";
    video.preload = "auto";
    video.loop = false; // we manage looping ourselves

    let hls = null;
    let vodDuration = NaN;
    let hb = null;
    let lastCT = 0;

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

        if (hls) {
          try {
            hls.stopLoad();
          } catch {}
          try {
            hls.startLoad(0);
          } catch {}
        } else {
          // non-Hls.js path: reload src to force restart
          video.src = "";
          setTimeout(() => {
            video.src = src;
          }, 0);
        }

        video.currentTime = start;
        const p = video.play();
        if (p && typeof p.catch === "function") p.catch(() => {});
      } catch {
        // ignore errors
      }
    };

    const onTimeupdate = () => {
      if (Number.isFinite(vodDuration) && vodDuration > 0) {
        if (vodDuration - video.currentTime <= 0.25) {
          restartFromStart();
        }
      }
    };

    const startHeartbeat = () => {
      if (hb) return;
      hb = setInterval(() => {
        const notAdvancing = Math.abs(video.currentTime - lastCT) < 0.01;
        lastCT = video.currentTime;

        if (
          (Number.isFinite(vodDuration) &&
            vodDuration - video.currentTime <= 0.5) ||
          video.ended ||
          (notAdvancing && video.currentTime > 0)
        ) {
          restartFromStart();
        }
      }, 350);
    };

    const stopHeartbeat = () => {
      if (hb) {
        clearInterval(hb);
        hb = null;
      }
    };

    const setup = () =>
      new Promise((resolve, reject) => {
        const ok = () => {
          video.addEventListener("timeupdate", onTimeupdate);
          startHeartbeat();
          resolve();
        };
        const fail = (e) => reject(e || new Error("HLS error"));

        if (Hls.isSupported()) {
          hls = new Hls({ autoStartLoad: true, lowLatencyMode: true });
          hls.attachMedia(video);
          hls.on(Hls.Events.MEDIA_ATTACHED, () => hls.loadSource(src));
          hls.on(Hls.Events.LEVEL_LOADED, (_evt, data) => {
            const det = data?.details;
            if (
              det &&
              det.live === false &&
              Number.isFinite(det.totalduration)
            ) {
              vodDuration = det.totalduration;
            }
          });
          hls.on(Hls.Events.MANIFEST_PARSED, ok);
          hls.on(Hls.Events.ERROR, (_evt, data) => {
            if (data?.fatal) fail();
          });
        } else {
          // Native HLS (Safari, some mobile)
          video.src = src;
          video.addEventListener("loadedmetadata", ok, { once: true });
          video.addEventListener("error", fail, { once: true });
        }
      });

    (async () => {
      try {
        await setup();
        try {
          await video.play();
        } catch {
          // ignore autoplay issues
        }
      } catch {
        // setup failed; nothing more to do
      }
    })();

    return () => {
      try {
        video.removeEventListener("timeupdate", onTimeupdate);
      } catch {}
      stopHeartbeat();
      try {
        hls?.destroy?.();
      } catch {}
      try {
        video.pause?.();
      } catch {}
      try {
        video.src = "";
      } catch {}
    };
  }, [src]);

  /* --------------------------------------------------------------------- */

  return (
    <section className="upcoming-section" ref={sectionRef}>
      {/* Massive background word with parallax */}
      <div
        ref={heroWordRef}
        className="upcoming-hero-word"
        aria-hidden
      >
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
        <video
          ref={videoRef}
          className="upcoming-video"
          muted
          playsInline
        />
      </div>
    </section>
  );
}
