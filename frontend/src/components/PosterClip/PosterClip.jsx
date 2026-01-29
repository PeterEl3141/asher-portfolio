// src/components/PosterClip/PosterClip.jsx
import React, { useEffect, useMemo, useRef } from "react";
import HLSVideo from "../HLSVideo";
import { useInView } from "../../hooks/useInView"; // adjust path if needed
import "./PosterClip.css";

export default function PosterClip({
  posterSrc,
  videoId,
  videoSrc,
  gapPx = 72,
  className = "",
  eager = false,
}) {
  const wrapRef = useRef(null);

  // Start only when actually approaching/entering viewport.
  // Tight rootMargin so it doesn't start "way before" the user reaches it.
  const inView = useInView(wrapRef, {
    rootMargin: "0px 0px -10% 0px", // starts when it's basically on screen
    threshold: 0.0,               // ~35% visible before we consider "active"
  });

  const active = eager || inView;

  // Only preload manifest if eager OR already near/in view
  useEffect(() => {
    if (!videoId) return;
    if (!active) return;

    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "fetch";
    link.href = `https://videodelivery.net/${videoId}/manifest/video.m3u8`;
    link.crossOrigin = "anonymous";
    document.head.appendChild(link);
    return () => document.head.removeChild(link);
  }, [videoId, active]);

  const hlsSrc = videoId
    ? `https://videodelivery.net/${videoId}/manifest/video.m3u8`
    : null;

  return (
    <section
      ref={wrapRef}
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
            active={active}       // ✅ NEW: parent controls play/load
            autoPlay
            muted
            playsInline
            loop
            className="posterclip__video w-full h-full object-cover"
          />
        ) : (
          <video
            className="posterclip__video w-full h-full object-cover"
            src={videoSrc}
            autoPlay={active}
            muted
            loop
            playsInline
            preload={active ? "auto" : "metadata"}
          />
        )}
      </div>
    </section>
  );
}
