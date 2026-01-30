// src/components/HLSVideo.jsx
import { useEffect, useRef } from "react";
import Hls from "hls.js";
import { toggleVideoAudio } from "../utils/videoAudioController";


export default function HLSVideo({
  src,
  active = true,
  autoPlay = true,
  muted = true,
  playsInline = true,
  loop = true,
  hoverSound = false, 
  className = "",
  onReady,
}) {
  const ref = useRef(null);
  const hlsRef = useRef(null);

  // state refs (don’t trigger rerenders)
  const hbRef = useRef(null);
  const lastCTRef = useRef(0);
  const vodDurationRef = useRef(NaN);
  const restartingRef = useRef(false);
  const soundUnlockedRef = useRef(false);

  // ---------- INIT PIPELINE (ONLY when src changes / mount) ----------
  useEffect(() => {
    const el = ref.current;
    if (!el || !src) return;

    el.playsInline = playsInline;
    el.muted = muted;
    el.autoplay = autoPlay;
    el.loop = false;

    let cancelled = false;

    const safePlay = () => {
      if (!autoPlay) return;
      try {
        const p = el.play();
        if (p && typeof p.catch === "function") p.catch(() => {});
      } catch {}
    };

    const seekableStart = () => {
      const s = el.seekable;
      if (s && s.length) { try { return s.start(0); } catch {} }
      const b = el.buffered;
      if (b && b.length) { try { return b.start(0); } catch {} }
      return 0;
    };

    const duration = () => {
      const v = vodDurationRef.current;
      const d = Number.isFinite(v) && v > 0 ? v : el.duration;
      return Number.isFinite(d) && d > 0 ? d : NaN;
    };

    const nearEnd = () => {
      const d = duration();
      if (!Number.isFinite(d)) return false;
      return d - el.currentTime <= 0.6;
    };

    // HARD LOOP: same behaviour you liked
    const restartFromStart = () => {
      if (!loop || restartingRef.current) return;
      restartingRef.current = true;

      const start = seekableStart() + 0.03;
      const hls = hlsRef.current;

      try { el.pause(); } catch {}

      if (hls) {
        try { hls.stopLoad(); } catch {}
        try { hls.startLoad(0); } catch {}
        try { el.currentTime = start; } catch {}
        safePlay();
        restartingRef.current = false;
        return;
      }

      // Native fallback: SRC FLUSH (only used for looping, not for scroll pause)
      try {
        el.removeAttribute("src");
        el.load();
      } catch {}

      setTimeout(() => {
        if (cancelled) return;
        try {
          el.src = src;
          el.load();
        } catch {}

        const onMeta = () => {
          try { el.currentTime = start; } catch {}
          safePlay();
          restartingRef.current = false;
        };

        el.addEventListener("loadedmetadata", onMeta, { once: true });

        // unlock guard
        setTimeout(() => {
          if (cancelled) return;
          restartingRef.current = false;
        }, 1500);
      }, 0);
    };

    const onTimeUpdate = () => {
      if (!loop) return;
      if (nearEnd()) restartFromStart();
    };

    const startHeartbeat = () => {
      if (hbRef.current) return;
      hbRef.current = setInterval(() => {
        // IMPORTANT: only enforce loop when the element is active/playing
        // (active gating happens in the active-effect below)
        const notAdvancing = Math.abs(el.currentTime - lastCTRef.current) < 0.01;
        lastCTRef.current = el.currentTime;

        if (nearEnd() || el.ended || (notAdvancing && el.currentTime > 0.5 && el.readyState >= 2)) {
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

    el.addEventListener("timeupdate", onTimeUpdate);

    const preferHlsJs = Hls.isSupported();

    if (preferHlsJs) {
      const hls = new Hls({ autoStartLoad: true, lowLatencyMode: true });
      hlsRef.current = hls;

      hls.attachMedia(el);
      hls.on(Hls.Events.MEDIA_ATTACHED, () => hls.loadSource(src));

      hls.on(Hls.Events.LEVEL_LOADED, (_evt, data) => {
        const det = data?.details;
        if (det && det.live === false && Number.isFinite(det.totalduration)) {
          vodDurationRef.current = det.totalduration;
        }
      });

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (cancelled) return;
        onReady?.();
        startHeartbeat();
        // play/pause is controlled by `active` effect below
      });

      return () => {
        cancelled = true;
        stopHeartbeat();
        el.removeEventListener("timeupdate", onTimeUpdate);
        try { hls.destroy(); } catch {}
        hlsRef.current = null;
      };
    }

    // Native HLS path
    el.src = src;
    el.addEventListener("loadedmetadata", () => {
      if (cancelled) return;
      onReady?.();
      startHeartbeat();
    }, { once: true });

    return () => {
      cancelled = true;
      stopHeartbeat();
      el.removeEventListener("timeupdate", onTimeUpdate);
    };
  }, [src, autoPlay, muted, playsInline, loop, onReady]);

  // ---------- ACTIVE CONTROL (PAUSE/RESUME ONLY, KEEP FRAME) ----------
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (!active) {
      // pause only (keeps last frame)
      try { el.pause(); } catch {}
      // optional: stop network while offscreen
      try { hlsRef.current?.stopLoad?.(); } catch {}
      return;
    }

    // resume
    try { hlsRef.current?.startLoad?.(0); } catch {}
    if (autoPlay) {
      try {
        const p = el.play();
        if (p && typeof p.catch === "function") p.catch(() => {});
      } catch {}
    }
  }, [active, autoPlay]);

  return (
  <video
    ref={ref}
    className={className}
    playsInline={playsInline}
    
  />
);


;
}
