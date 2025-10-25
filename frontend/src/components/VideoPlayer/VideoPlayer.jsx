import React, { useEffect, useMemo, useRef, useState } from "react";
import "./VideoPlayer.css";
import FinDivider from "../FinDivider.jsx";
import finWhite from "/images/Fin-white.png";
import { attachHls } from "../../lib/attachHls.js";

/* 1x1 transparent so band <img> is never empty */
const BLANK = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";

/** Build a Cloudflare Stream HLS URL from an id */
const hlsSrc = (id) => `https://videodelivery.net/${id}/manifest/video.m3u8`;

export default function VideoPlayer({
  videos = [],
  initialIndex = 0,
  muted = true,
  loop = true,
  autoPlay = true,
  bandPixelCols = 12,
  pixelMaxCols = 28,
  baseDuration = 1000,
  easing = "cubic-bezier(.22,1,.36,1)",
  distanceStep = 0.15,
}) {
  // Items like: { id: "<STREAM_ID>", poster: "/posters/..", title: "..." }
  const items = Array.isArray(videos) ? videos : [];
  const [current, setCurrent] = useState(
    Math.min(Math.max(initialIndex, 0), Math.max(items.length - 1, 0))
  );
  const [morphing, setMorphing] = useState(false);
  const [corridor, setCorridor] = useState(new Set());

  // DOM refs
  const rootRef       = useRef(null);
  const rowRef        = useRef(null);
  const bandRefs      = useRef([]);
  const playerCellRef = useRef(null);   // stable DOM node (moved, not remounted)
  const stageMountRef = useRef(null);   // we append the live <video> here
  const liveVidRef    = useRef(null);

  // Overlays
  const inRef  = useRef(null);
  const outRef = useRef(null);

  // Caches
  const pixelCache = useRef(new Map());
  const aspectRef  = useRef(16 / 9);
  const startedRef = useRef(false); // did the live player actually start?

  const getPoster = (v) => v.poster || "";

  const cssLenToPx = (v) => {
    if (!v) return 0;
    const s = String(v).trim();
    if (s.endsWith("px")) return parseFloat(s);
    if (s.endsWith("vh")) return (parseFloat(s) / 100) * innerHeight;
    if (s.endsWith("vw")) return (parseFloat(s) / 100) * innerWidth;
    const n = parseFloat(s); return Number.isFinite(n) ? n : 0;
  };
  const stageCapPx = () => {
    const root = rootRef.current;
    const raw = getComputedStyle(root).getPropertyValue("--stage-height").trim() || "68vh";
    return cssLenToPx(raw);
  };

  // Keep order [...left, center, ...right] for layout
  const order = useMemo(() => {
    if (!items.length) return [];
    return [...items.slice(0, current), items[current], ...items.slice(current + 1)];
  }, [items, current]);
  const orderedIndices = useMemo(() => {
    const arr = items.map((_, i) => i);
    return [...arr.slice(0, current), current, ...arr.slice(current + 1)];
  }, [items.length, current]);

  // Helper to size a video element to the stage height (natural aspect)
  const sizeStageVideo = (el) => {
    const box = playerCellRef.current;
    if (!el || !box) return;
    const w = box.getBoundingClientRect().width || 1;
    const cap = stageCapPx() || innerHeight * 0.68;
    const wanted = w / Math.max(0.001, aspectRef.current);
    const h = Math.min(cap, wanted);
    el.style.width = "auto";
    el.style.height = `${h}px`;
    el.style.maxHeight = "none";
    el.style.objectFit = "contain";
    el.style.display = "block";
    el.style.margin = "0 auto";
  };

  // Cleanly wire an HTMLVideoElement to a Stream item (robust + force start)
  const setupVideoEl = (el, item, { onReady, forceStartMs = 2000 } = {}) => {
    el.playsInline = true;
    el.muted = autoPlay ? true : muted;
    el.autoplay = autoPlay;
    el.preload = "auto";
    el.loop = false;             // manual loop for HLS
    el.crossOrigin = "anonymous";
    el.poster = getPoster(item) || "";
    el.style.background = "#000";
    sizeStageVideo(el);

    // fire once
    let readyCalled = false;
    const callReady = () => { if (!readyCalled) { readyCalled = true; onReady?.(); } };

    // consider "started" once a frame is decoded or playback runs
    const markStarted = () => {
      if (startedRef.current) return;
      startedRef.current = true;
      try { el.removeAttribute("poster"); } catch {}
      callReady();
    };

    const handleEnded = () => {
      if (!loop) return;
      try { el.currentTime = 0; el.play()?.catch(() => {}); } catch {}
    };
    el.addEventListener("ended", handleEnded);

    const onMeta = () => {
      if (el.videoWidth && el.videoHeight) aspectRef.current = el.videoWidth / el.videoHeight;
      sizeStageVideo(el);
    };
    el.addEventListener("loadedmetadata", onMeta);
    el.addEventListener("loadeddata", markStarted);
    el.addEventListener("playing",    markStarted);
    const onTU = function once() { if (el.currentTime > 0.02) { markStarted(); el.removeEventListener("timeupdate", once); } };
    el.addEventListener("timeupdate", onTU);

    const tryPlay = () => { try { if (autoPlay) el.play(); } catch {} };
    tryPlay();
    const deadline = Date.now() + forceStartMs;
    const playTicker = setInterval(() => {
      if (startedRef.current || Date.now() > deadline) { clearInterval(playTicker); return; }
      tryPlay();
    }, 300);

    const watchdog = setInterval(() => {
      if (el.readyState >= 3) { onMeta(); clearInterval(watchdog); }
    }, 250);

    let ro;
    if (playerCellRef.current) {
      ro = new ResizeObserver(() => sizeStageVideo(el));
      ro.observe(playerCellRef.current);
    }

    const cleanupHls = attachHls(el, hlsSrc(item.id), { onReady: callReady });

    el._vp_cleanup = () => {
      clearInterval(playTicker);
      clearInterval(watchdog);
      ro?.disconnect();
      el.removeEventListener("ended", handleEnded);
      el.removeEventListener("loadedmetadata", onMeta);
      el.removeEventListener("loadeddata", markStarted);
      el.removeEventListener("playing",    markStarted);
      el.removeEventListener("timeupdate", onTU);
      try { cleanupHls && cleanupHls(); } catch {}
    };
  };

  const teardownVideoEl = (el) => { try { el?._vp_cleanup?.(); } catch {} };

  // ---- PRIME CURRENT (simulate the successful hover path, silently) ----
  const once = (el, ev) => new Promise((res) => el.addEventListener(ev, res, { once: true }));

  const primeCurrent = async (idx) => {
    if (!items[idx]) return;
    const mount = stageMountRef.current;
    const prev  = liveVidRef.current;

    const incoming = document.createElement("video");
    setupVideoEl(incoming, items[idx], { onReady: () => sizeStageVideo(incoming) });

    await once(incoming, "loadedmetadata");
    if (incoming.videoWidth && incoming.videoHeight) {
      aspectRef.current = incoming.videoWidth / incoming.videoHeight;
    }
    sizeStageVideo(incoming);

    if (prev && prev.parentNode === mount) { mount.removeChild(prev); teardownVideoEl(prev); }
    mount.appendChild(incoming);
    liveVidRef.current = incoming;
    try { await incoming.play(); } catch {}
  };

  // Prime immediately after first paint AND again ~5.5s later (post-hero)
  useEffect(() => {
    if (!items.length) return;
    let t2;
    const t1 = requestAnimationFrame(() => {
      primeCurrent(current);
      t2 = setTimeout(() => { if (!startedRef.current) primeCurrent(current); }, 5500);
    });
    return () => { cancelAnimationFrame(t1); clearTimeout(t2); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length]);

  // ---- Pixelation helpers (unchanged) ----
  function loadImage(src) {
    return new Promise((res, rej) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => res(img);
      img.onerror = () => rej(new Error("img load"));
      img.src = src;
    });
  }
  function coverRect(sw, sh, dw, dh) {
    const sR = sw / sh, dR = dw / dh;
    if (sR > dR) { const cw = sh * dR, cx = (sw - cw) / 2; return { sx: cx, sy: 0, sw: cw, sh }; }
    const ch = sw / dR, cy = (sh - ch) / 2; return { sx: 0, sy: cy, sw: sw, sh: ch };
  }
  async function makePixelatedToSize(src, destW, destH, colsTarget) {
    const cols = Math.max(8, Math.min(pixelMaxCols, colsTarget));
    const rows = Math.max(8, Math.round(cols * (destH / Math.max(1, destW))));
    const key  = `${src}|${destW}x${destH}|${cols}x${rows}`;
    if (pixelCache.current.has(key)) return pixelCache.current.get(key);
    try {
      const img  = await loadImage(src);
      const tiny = document.createElement("canvas");
      tiny.width = cols; tiny.height = rows;
      const tctx = tiny.getContext("2d", { willReadFrequently: true });
      tctx.imageSmoothingEnabled = false;
      const { sx, sy, sw, sh } = coverRect(img.width, img.height, cols, rows);
      tctx.drawImage(img, sx, sy, sw, sh, 0, 0, cols, rows);

      const big  = document.createElement("canvas");
      big.width  = destW; big.height = destH;
      const bctx = big.getContext("2d");
      bctx.imageSmoothingEnabled = false;
      bctx.drawImage(tiny, 0, 0, destW, destH);
      const url = big.toDataURL("image/png");
      pixelCache.current.set(key, url);
      return url;
    } catch { return src; }
  }
  const ensureBandPoster = async (bandEl, idx) => {
    if (!bandEl) return;
    const img = bandEl.querySelector("img.vp-pixel");
    if (!img) return;
    if (!img.getAttribute("src")) img.setAttribute("src", BLANK);
    const r = bandEl.getBoundingClientRect();
    const poster = getPoster(items[idx]);
    const url = await makePixelatedToSize(poster, Math.max(1, r.width|0), Math.max(1, r.height|0), bandPixelCols);
    img.onload = () => { img.style.visibility = "visible"; };
    img.style.visibility = "hidden";
    img.src = url;
  };

  // (Re)pixelate on size changes
  useEffect(() => {
    if (!bandRefs.current?.length) return;
    const ro = new ResizeObserver((entries) => {
      entries.forEach((entry) => {
        const el = entry.target;
        if (!el.classList.contains("vp-cell--band")) return;
        const idxAttr = el.getAttribute("data-orig-idx");
        if (idxAttr == null) return;
        ensureBandPoster(el, parseInt(idxAttr, 10));
      });
    });
    bandRefs.current.forEach((el) => el && ro.observe(el));
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order, items, bandPixelCols, pixelMaxCols]);

  // ------------ Switch ------------
  const corridorBetween = (from, to) => {
    const set = new Set();
    if (to > from) for (let i = from + 1; i < to; i++) set.add(i);
    else for (let i = from - 1; i > to; i--) set.add(i);
    return set;
  };

  const beginSwitch = async (origIdx) => {
    if (!items.length || morphing || origIdx === current) return;

    const bandEl   = bandRefs.current[origIdx];
    const stageEl  = playerCellRef.current;
    const live     = liveVidRef.current;
    if (!bandEl || !stageEl || !live) return;

    setMorphing(true);
    setCorridor(corridorBetween(current, origIdx));

    const b = bandEl.getBoundingClientRect();
    const s = stageEl.getBoundingClientRect();
    const fromLeft = origIdx < current;

    // Outgoing still
    const outUrl = await makePixelatedToSize(
      getPoster(items[current]), Math.max(1, s.width|0), Math.max(1, s.height|0), 40
    );
    Object.assign(outRef.current.style, {
      display: "block",
      left: `${s.left}px`,
      top: `${s.top}px`,
      width: `${s.width}px`,
      height: `${s.height}px`,
      backgroundImage: `url(${outUrl})`,
    });

    // Opposite band target for outgoing
    const idxToLeft  = orderedIndices[current - 1];
    const idxToRight = orderedIndices[current + 1];
    const oppEl = fromLeft
      ? (idxToRight != null ? bandRefs.current[idxToRight] : bandEl)
      : (idxToLeft  != null ? bandRefs.current[idxToLeft]  : bandEl);
    const o = oppEl.getBoundingClientRect();

    // Incoming video (Cloudflare HLS)
    const incoming = document.createElement("video");
    setupVideoEl(incoming, items[origIdx], { onReady: () => sizeStageVideo(incoming) });
    await new Promise((res) => incoming.addEventListener("loadedmetadata", res, { once: true }));
    if (incoming.videoWidth && incoming.videoHeight) {
      aspectRef.current = incoming.videoWidth / incoming.videoHeight;
    }
    sizeStageVideo(incoming);

    // ---- CENTERED, PURELY HORIZONTAL TRANSITION ----
    const inBox = inRef.current;

    // Overlay takes FINAL stage rect; match fit to avoid snap-on-adopt
    Object.assign(inBox.style, {
      display: "block",
      left: `${s.left}px`,
      top: `${s.top}px`,
      width: `${s.width}px`,
      height: `${s.height}px`,
      transformOrigin: "center center",
      willChange: "transform"
    });

    // Video fills overlay with same 'contain' fit as the stage
    incoming.style.position = "absolute";
    incoming.style.inset = 0;
    incoming.style.width = "100%";
    incoming.style.height = "100%";
    incoming.style.objectFit = "contain";
    inBox.innerHTML = "";
    inBox.appendChild(incoming);

    // Centers
    const bCx = b.left + b.width / 2;
    const sCx = s.left + s.width / 2;

    // Strictly horizontal travel (no vertical drift)
    const dx  = bCx - sCx;
    const dy  = 0;

    // Scale from pillar rect to stage rect on both axes
    const scaleX = Math.max(0.0001, b.width  / Math.max(1, s.width));
    const scaleY = Math.max(0.0001, b.height / Math.max(1, s.height));

    // durations
    const distance = Math.abs(origIdx - current);
    const duration = Math.round(baseDuration * (1 + distanceStep * Math.max(0, distance - 1)));

    // animate outgoing to opposite band
    outRef.current.animate(
      [
        { left: `${s.left}px`, top: `${s.top}px`, width: `${s.width}px`, height: `${s.height}px` },
        { left: `${o.left}px`, top: `${o.top}px`, width: `${o.width}px`, height: `${o.height}px` }
      ],
      { duration, easing, fill: "forwards" }
    );

    // animate incoming from pillar CENTER to stage (centered all the way)
    const inAnim = inBox.animate(
      [
        { transform: `translate(${dx}px, ${dy}px) scale(${scaleX}, ${scaleY})` },
        { transform: `translate(0px, 0px) scale(1, 1)` }
      ],
      { duration, easing, fill: "forwards" }
    );

    // hide the live under the still
    live.style.visibility = "hidden";
    try { live.pause(); } catch {}

    inAnim.onfinish = () => finishSwitch(origIdx, incoming);
    inAnim.oncancel = () => finishSwitch(origIdx, incoming);
  };

  const finishSwitch = (nextIdx, incomingVideoEl) => {
    const mount = stageMountRef.current;
    const prev  = liveVidRef.current;

    if (incomingVideoEl && mount) {
      if (prev && prev.parentNode === mount) { mount.removeChild(prev); teardownVideoEl(prev); }
      sizeStageVideo(incomingVideoEl);
      incomingVideoEl.style.position = "";
      incomingVideoEl.style.inset = "";
      incomingVideoEl.style.width = "auto";
      incomingVideoEl.style.objectFit = "contain";
      mount.appendChild(incomingVideoEl);
      liveVidRef.current = incomingVideoEl;
      try { incomingVideoEl.play(); } catch {}
    }

    if (inRef.current)  inRef.current.style.display  = "none";
    if (outRef.current) outRef.current.style.display = "none";

    setCurrent(nextIdx);
    setCorridor(new Set());
    setMorphing(false);

    requestAnimationFrame(() => {
      bandRefs.current.forEach((el, i) => el && ensureBandPoster(el, i));
    });
  };

  if (!items.length) return <div className="vp-empty">Provide videos to VideoPlayer</div>;

  const finH = 80;

  return (
    <section ref={rootRef} className="vp-root">
      <div className="fin-overlay" aria-hidden="true">
        <FinDivider
          src={finWhite}
          tileWidth={180}
          overlap={90}
          tileHeight={finH}
          mount="lower"
          offset={0}
          scrollLinked
          speedX={0.35}
        />
      </div>

      <div className="vp-stage-wrap">
        <div
          ref={rowRef}
          className={`vp-row--fixed ${morphing ? "is-lock" : ""}`}
          style={{ "--vp-band-w": "24px" }}  // thicker pillars; tweak to taste
        >
          {order.map((v, localIdx) => {
            const origIdx = orderedIndices[localIdx];
            const isPlayerCell = origIdx === current;
            const isCorr = corridor.has(origIdx);

            const key = isPlayerCell ? "vp-player" : `${origIdx}-${v.id}`;

            return (
              <button
                key={key}
                data-orig-idx={origIdx}
                ref={(el) => {
                  bandRefs.current[origIdx] = el;
                  if (isPlayerCell) playerCellRef.current = el;
                }}
                className={`vp-cell ${isPlayerCell ? "vp-cell--player" : "vp-cell--band"} ${isCorr ? "vp-cell--corridor" : ""}`}
                title={v.title || `Video ${origIdx + 1}`}
                onMouseEnter={() => !isPlayerCell && beginSwitch(origIdx)}
              >
                {isPlayerCell ? (
                  <div className="vp-active-shell">
                    <div ref={stageMountRef} className="vp-stage-mount" />
                    {items[current]?.title && <div className="vp-bug">{items[current].title}</div>}
                  </div>
                ) : (
                  <img className="vp-pixel" alt="" src={BLANK} />
                )}
              </button>
            );
          })}
        </div>

        {/* overlays for slide in/out */}
        <div ref={outRef} className="vp-fly-out" aria-hidden="true" />
        <div ref={inRef}  className="vp-fly-in"  aria-hidden="true" />
      </div>
    </section>
  );
}
