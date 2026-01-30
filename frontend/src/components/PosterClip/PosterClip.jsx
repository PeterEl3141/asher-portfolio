// src/components/PosterClip/PosterClip.jsx
import React, { useEffect, useRef, useState } from "react";
import HLSVideo from "../HLSVideo";
import { useInView } from "../../hooks/useInView";
import "./PosterClip.css";
import { toggleVideoAudio, muteIfCurrent } from "../../utils/videoAudioController";

export default function PosterClip({
  posterSrc,
  videoId,
  videoSrc,
  gapPx = 72,
  className = "",
  eager = false,
}) {
  const wrapRef = useRef(null);

  // UI state (cursor etc.) must be React state — NOT derived from videoRef.current
  const [isAudible, setIsAudible] = useState(false);

  const inView = useInView(wrapRef, {
    rootMargin: "0px 0px -10% 0px",
    threshold: 0.0,
  });

  const active = eager || inView;

  // Helper: always get the REAL <video> element (works for HLSVideo or native)
  const getVideoEl = () => wrapRef.current?.querySelector("video") || null;

  // If this PosterClip scrolls offscreen, ensure audio fades out + cursor resets
  useEffect(() => {
    if (active) return;
    const v = getVideoEl();
    if (!v) return;

    muteIfCurrent(v);
    setIsAudible(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

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

  const onToggleAudio = () => {
    const v = getVideoEl();
    if (!v) return;

    // toggleVideoAudio should:
    // - set "current video" globally
    // - fade in/out
    // - return true/false for "audible now"
    const nowAudible = toggleVideoAudio(v);
    setIsAudible(!!nowAudible);
  };

  return (
    <section
  ref={wrapRef}
  className={`posterclip ${className}`}
  
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

      <div className="posterclip__videoWrap"
          style={{
        ["--posterclip-gap"]: `${gapPx}px`,
        cursor: isAudible
          ? "var(--cursor-muted)"
          : "var(--cursor-speaker)",
      }}
      onClick={() => {
        const v = getVideoEl();
        if (!v) return;
        const nowAudible = toggleVideoAudio(v);
        setIsAudible(nowAudible);
      }}>
        {hlsSrc ? (
          <HLSVideo
            src={hlsSrc}
            active={active}
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
