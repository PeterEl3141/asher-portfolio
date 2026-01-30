// src/components/Upcoming/Upcoming.jsx
import React, { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { useInView } from "../../hooks/useInView";
import "./Upcoming.css";
import {
  toggleVideoAudio,
  muteIfCurrent,
  isCurrentAudible,
} from "../../utils/videoAudioController";

const VIDEO_ID = "c049d08d9ed0cf843851dab095d0fc10";
const hlsSrc = (id) => `https://videodelivery.net/${id}/manifest/video.m3u8`;

export default function Upcoming() {
  const sectionRef = useRef(null);
  const heroWordRef = useRef(null);
  const videoRef = useRef(null);

  const hlsRef = useRef(null);
  const vodDurationRef = useRef(NaN);

  const [isAudible, setIsAudible] = useState(false);

  const src = hlsSrc(VIDEO_ID);

  /* ---------------- Visibility ---------------- */
  const inView = useInView(sectionRef, { threshold: 0.0 });
  const active = inView;

  /* ---------------- Mute when scrolled out ---------------- */
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    if (!active) {
      muteIfCurrent(v);
      setIsAudible(false);
    }
  }, [active]);

  /* ---------------- Parallax word ---------------- */
  /* ---------------- Parallax word ---------------- */
useEffect(() => {
  const section = sectionRef.current;
  const word = heroWordRef.current;
  if (!section || !word) return;

  let ticking = false;

  const readVars = () => {
    const styles = getComputedStyle(section);
    const factor =
      parseFloat(styles.getPropertyValue("--upcoming-parallax-factor")) || 0.5;
    const baseY =
      parseFloat(styles.getPropertyValue("--upcoming-word-base-y")) || 0;

    return { factor, baseY };
  };

  let { factor, baseY } = readVars();

  const update = () => {
    const rect = section.getBoundingClientRect();

    // Always clear ticking, even if offscreen
    if (rect.bottom <= 0 || rect.top >= window.innerHeight) {
      ticking = false;
      return;
    }

    // ✅ Reduced motion: factor is smaller on mobile
    // ✅ Start lower: baseY comes from CSS
    const y = baseY + (-rect.top * factor);

    // Optional safety clamp so it can’t fly too far upward
    // (tweak -160 / 500 if you want)
    const clampedY = Math.max(-160, Math.min(y, 500));

    word.style.transform = `translate3d(-50%, ${clampedY}px, 0)`;
    ticking = false;
  };

  const onScroll = () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  };

  update();

  window.addEventListener("scroll", onScroll, { passive: true });
  document.addEventListener("scroll", onScroll, { passive: true, capture: true });

  window.addEventListener("resize", () => {
    // re-read vars on resize so breakpoint changes update factor/baseY
    ({ factor, baseY } = readVars());
    onScroll();
  });

  return () => {
    window.removeEventListener("scroll", onScroll);
    document.removeEventListener("scroll", onScroll, { capture: true });
    window.removeEventListener("resize", onScroll);
  };
}, []);

  /* ---------------- Preload HLS when active ---------------- */
  useEffect(() => {
    if (!src || !active) return;
    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "fetch";
    link.href = src;
    link.crossOrigin = "anonymous";
    document.head.appendChild(link);
    return () => document.head.removeChild(link);
  }, [src, active]);

  /* ---------------- Build HLS pipeline once ---------------- */
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    video.playsInline = true;
    video.muted = true;
    video.autoplay = true;
    video.crossOrigin = "anonymous";
    video.preload = "auto";
    video.loop = false;

    const nearEnd = () => {
      const d =
        Number.isFinite(vodDurationRef.current) && vodDurationRef.current > 0
          ? vodDurationRef.current
          : video.duration;
      return Number.isFinite(d) && d - video.currentTime <= 0.6;
    };

    const onTimeUpdate = () => {
      if (!active || !nearEnd()) return;
      try {
        video.currentTime = 0.03;
        video.play().catch(() => {});
      } catch {}
    };

    video.addEventListener("timeupdate", onTimeUpdate);

    if (Hls.isSupported()) {
      const hls = new Hls({ autoStartLoad: false, lowLatencyMode: true });
      hlsRef.current = hls;

      hls.attachMedia(video);
      hls.on(Hls.Events.MEDIA_ATTACHED, () => {
        hls.loadSource(src);
        if (active) hls.startLoad(0);
      });

      hls.on(Hls.Events.LEVEL_LOADED, (_, data) => {
        const d = data?.details;
        if (d && !d.live && Number.isFinite(d.totalduration)) {
          vodDurationRef.current = d.totalduration;
        }
      });

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (active) video.play().catch(() => {});
      });
    } else {
      video.src = src;
      video.addEventListener(
        "loadedmetadata",
        () => active && video.play().catch(() => {}),
        { once: true }
      );
    }

    return () => {
      video.removeEventListener("timeupdate", onTimeUpdate);
      hlsRef.current?.destroy?.();
      hlsRef.current = null;
      video.pause();
    };
  }, [src]);

  /* ---------------- Pause / resume ---------------- */
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    if (!active) {
      v.pause();
      hlsRef.current?.stopLoad?.();
    } else {
      hlsRef.current?.startLoad?.(0);
      v.play().catch(() => {});
    }
  }, [active]);

  /* ---------------- Render ---------------- */
  return (
  <section className="upcoming-section" ref={sectionRef}>
    <div ref={heroWordRef} className="upcoming-hero-word" aria-hidden>
      UPCOMING
    </div>

    <div className="upcoming-main">
      <img
        src="/images/smallgods.png"
        alt="Upcoming — trailer artwork"
        className="upcoming-main-img"
      />
    </div>

    <div
      className="upcoming-video-wrap"
      style={{
        cursor: isAudible ? "var(--cursor-muted)" : "var(--cursor-speaker)",
      }}
      onPointerDown={(e) => {
        // Only primary mouse button / primary touch
        if (e.pointerType === "mouse" && e.button !== 0) return;

        const v = videoRef.current;
        if (!v) return;

        // Prevent this gesture from bubbling into other handlers (if any)
        e.stopPropagation();

        toggleVideoAudio(v);

        // 🔑 Sync UI cursor with the real global audio state
        setIsAudible(isCurrentAudible(v));
      }}
    >
      <video
        ref={videoRef}
        className="upcoming-video"
        muted
        playsInline
        // cursor is inherited from the wrap (you already have CSS for this)
      />
    </div>
  </section>
);

}
