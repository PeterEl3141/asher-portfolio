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
  useEffect(() => {
    const section = sectionRef.current;
    const word = heroWordRef.current;
    if (!section || !word) return;

    const factor = 0.5;
    let ticking = false;

    const update = () => {
      const rect = section.getBoundingClientRect();
      if (rect.bottom <= 0 || rect.top >= window.innerHeight) return;
      word.style.transform = `translate3d(-50%, ${-rect.top * factor}px, 0)`;
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
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
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

      <div className="upcoming-video-wrap">
        <video
          ref={videoRef}
          className="upcoming-video"
          muted
          playsInline
          style={{
            cursor: isAudible
              ? "var(--cursor-muted)"
              : "var(--cursor-speaker)",
          }}
          onClick={(e) => {
            e.stopPropagation();
            const v = videoRef.current;
            if (!v) return;

            toggleVideoAudio(v);
            setIsAudible(isCurrentAudible(v));
          }}
        />
      </div>
    </section>
  );
}
