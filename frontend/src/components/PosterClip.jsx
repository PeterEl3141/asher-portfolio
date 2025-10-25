import React, { useEffect, useRef } from "react";
import HLSVideo from "../components/HLSVideo"; // adjust path if needed
import "./PosterClip.css";

/**
 * PosterClip
 * Props:
 *  - posterSrc (string): path to poster image (e.g., "/images/hero.jpg")
 *  - videoId   (string, optional): Cloudflare Stream VIDEO ID (preferred)
 *  - videoSrc  (string, optional): fallback MP4 path while migrating
 *  - gapPx     (number, optional): vertical gap between poster and video (px)
 *  - className (string, optional): additional class names
 */
export default function PosterClip({ posterSrc, videoId, videoSrc, gapPx = 72, className = "" }) {
  const videoRef = useRef(null);

  // Preload HLS manifest for a quicker start (no-op if no videoId)
  useEffect(() => {
    if (!videoId) return;
    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "fetch";
    link.href = `https://videodelivery.net/${videoId}/manifest/video.m3u8`;
    link.crossOrigin = "anonymous";
    document.head.appendChild(link);
    return () => document.head.removeChild(link);
  }, [videoId]);

  // (Only used for MP4 fallback autoplay)
  useEffect(() => {
    if (videoId) return; // HLSVideo handles autoplay
    const v = videoRef.current;
    if (!v) return;
    const tryPlay = async () => { try { await v.play(); } catch {} };
    tryPlay();
  }, [videoId]);

  const hlsSrc = videoId ? `https://videodelivery.net/${videoId}/manifest/video.m3u8` : null;

  return (
    <section
      className={`posterclip ${className}`}
      style={{ ["--posterclip-gap"]: `${gapPx}px` }}
    >
      <div className="posterclip__posterWrap">
        <img
          className="posterclip__poster"
          src={posterSrc}
          alt=""
          loading="eager"
          fetchpriority="high"
          decoding="async"
        />
      </div>

      <div className="posterclip__gap" aria-hidden="true" />

      <div className="posterclip__videoWrap">
        {hlsSrc ? (
          <HLSVideo
            src={hlsSrc}
            autoPlay
            muted
            playsInline
            loop
            className="posterclip__video w-full h-full object-cover"
          />
        ) : (
          <video
            ref={videoRef}
            className="posterclip__video w-full h-full object-cover"
            src={videoSrc}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
          />
        )}
      </div>
    </section>
  );
}
