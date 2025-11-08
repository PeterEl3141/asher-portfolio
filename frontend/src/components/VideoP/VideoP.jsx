// components/VideoP/VideoP.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import * as PIXI from "pixi.js";
import { Assets } from "pixi.js";
import { gsap } from "gsap";
import Hls from "hls.js";
import "./VideoP.css";
// (imported but not used here; safe to keep if you add the divider overlay)
// import FinDivider from "../FinDivider.jsx";
// import finWhite from "/images/Fin-white.png";

/* ------------------------------- Utils ------------------------------- */

const hlsSrc = (id) => `https://videodelivery.net/${id}/manifest/video.m3u8`;

/** Crisp pixelation via cell-center sampling (v8-safe) */
class PixelateColsFilter extends PIXI.Filter {
  constructor(cols = 8, aspect = 1, sat = 1.15) {
    const fragment = `
      varying vec2 vTextureCoord;
      uniform sampler2D uSampler;
      uniform float uCols;
      uniform float uAspect;
      uniform float uSat;

      vec3 sat(vec3 c, float s){
        float l = dot(c, vec3(0.2126,0.7152,0.0722));
        return mix(vec3(l), c, s);
      }
      void main(){
        float cols = max(4.0, uCols);
        float rows = cols * max(0.001, uAspect);
        vec2 cell = vec2(cols, rows);
        vec2 q = (floor(vTextureCoord * cell) + 0.5) / cell;
        vec4 c = texture2D(uSampler, q);
        c.rgb = sat(c.rgb, uSat);
        gl_FragColor = c;
      }
    `;
    super(undefined, fragment, { uCols: cols, uAspect: aspect, uSat: sat });
  }
}

function fitContain(texW, texH, boxW, boxH){
  const rS = texW / Math.max(1, texH);
  const rB = boxW / Math.max(1, boxH);
  let w = boxW, h = boxH;
  if (rS > rB) h = boxW / rS; else w = boxH * rS;
  const x = (boxW - w) * 0.5, y = (boxH - h) * 0.5;
  return { x, y, w, h, scaleX: w / texW, scaleY: h / texH };
}

/** HLS-backed <video> → Pixi Texture (with 'nearest' sampling) */
async function createStreamVideo(id, { autoplay = true, muted = true } = {}){
  const el = document.createElement("video");
  el.playsInline = true; el.muted = muted; el.autoplay = autoplay;
  el.crossOrigin = "anonymous"; el.preload = "auto";
  const src = hlsSrc(id);
  const canNativeHls = el.canPlayType?.("application/vnd.apple.mpegURL");
  let hls;

  await new Promise((resolve, reject) => {
    const ok = () => resolve();
    const fail = (e) => reject(e || new Error("HLS error"));
    if (canNativeHls){
      el.src = src;
      el.addEventListener("loadedmetadata", ok, { once: true });
      el.addEventListener("error", fail, { once: true });
    } else if (Hls.isSupported()){
      hls = new Hls({ autoStartLoad: true, lowLatencyMode: true });
      hls.attachMedia(el);
      hls.on(Hls.Events.MEDIA_ATTACHED, () => hls.loadSource(src));
      hls.on(Hls.Events.MANIFEST_PARSED, ok);
      hls.on(Hls.Events.ERROR, (_, d) => { if (d?.fatal) fail(); });
    } else fail(new Error("No HLS support"));
  });

  try { if (autoplay) await el.play(); } catch {}

  const texture = PIXI.Texture.from(el);
  try { texture.source.scaleMode = 'nearest'; } catch {}
  const destroy = () => { try { hls?.destroy?.(); } catch {}; try { el.pause?.(); } catch {}; try { el.src=""; } catch {}; };
  return { video: el, texture, destroy };
}

/* ------------------------------ Component ------------------------------ */

export default function VideoP({
  videos = [],
  initialIndex = 0,
  bandWidth = 28,          // pillar thickness (px)
  bandGap = 12,            // gap between pillars (px)
  bandCols = 8,            // lower = chunkier squares
  transitionMs = 400,      // morph duration
  innerGap = 16,           // gap between center & nearest pillar
  pillarSaturation = 1.2,
  hoverDelayMs = 140,
  hoverCooldownMs = 220,
  stackAt = 900,           // 👈 when container width <= this, stack pillars top/bottom
}){
  const containerRef = useRef(null);
  const appRef = useRef(null);

  const [current, setCurrent] = useState(
    Math.min(Math.max(initialIndex, 0), Math.max(videos.length - 1, 0))
  );

  const poolRef = useRef(new Map());               // idx -> { video, texture, destroy }
  const animatingRef = useRef(false);

  const centerRef = useRef(null);                  // center sprite
  const railRef   = useRef(null);                  // pillars container
  const roRef     = useRef(null);
  const pillarsMapRef = useRef(new Map());         // origIdx -> pillar Sprite

  // Layout mode: "h" (left/right rails) or "v" (top/bottom rails)
  const layoutModeRef = useRef("h");

  // Hover-intent & cooldown
  const hoverTimerRef = useRef(null);
  const hoverIdxRef   = useRef(null);
  const hoverCooldownUntilRef = useRef(0);
  const layoutTickRef = useRef(0);

  const posterURLs = useMemo(() => videos.map(v => v.poster).filter(Boolean), [videos]);
  useMemo(() => videos.map(v => {
    const t = PIXI.Texture.from(v.poster);
    try { t.source.scaleMode = 'nearest'; } catch {}
    return t;
  }), [videos]);

  /* ----------------------------- Mount -------------------------------- */

  useEffect(() => {
    if (!containerRef.current) return;
    let disposed = false;

    (async () => {
      const app = new PIXI.Application();
      const el = containerRef.current;
      const w = Math.max(1, Math.round(el.clientWidth));
      const h = Math.max(1, Math.round(el.clientHeight));

      await app.init({
        width: w, height: h,
        antialias: false,
        powerPreference: "high-performance",
        background: 0xffffff,  // white canvas (works with your white page)
        backgroundAlpha: 1,
        hello: false,
      });
      if (disposed) { try { app.destroy(true); } catch {} return; }

      appRef.current = app;
      el.appendChild(app.canvas);
      app.canvas.classList.add("videoP-canvas");

      try { PIXI.settings.MIPMAP_TEXTURES = PIXI.MIPMAP_MODES.OFF; } catch {}
      app.stage.sortableChildren = true;

      try { if (posterURLs.length) await Assets.load(posterURLs); } catch {}

      buildStage();
      layoutAll();
      await primePool(current);
      centerRef.current.zIndex = 5;
      railRef.current.zIndex = 0;

      const ro = new ResizeObserver(() => {
        if (!appRef.current || !containerRef.current) return;
        const cw = Math.max(1, Math.round(containerRef.current.clientWidth));
        const ch = Math.max(1, Math.round(containerRef.current.clientHeight));
        appRef.current.renderer.resize(cw, ch);
        layoutAll();
      });
      ro.observe(el);
      roRef.current = ro;
    })();

    return () => {
      try { roRef.current?.disconnect?.(); } catch {}
      cancelHoverTimer();
      for (const [, rec] of poolRef.current) { try { rec.destroy?.(); } catch {} }
      poolRef.current.clear();
      try { appRef.current?.destroy(true, { children: true, texture: true, baseTexture: true }); } catch {}
      appRef.current = null;
      disposed = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!appRef.current || !centerRef.current) return;
    layoutAll();
    primePool(current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, videos.length, bandWidth, bandGap, bandCols, innerGap, pillarSaturation, stackAt]);

  /* ---------------------------- Layout -------------------------------- */

  function buildStage(){
    const app = appRef.current;
    app.stage.removeChildren();

    const center = new PIXI.Sprite(PIXI.Texture.WHITE);
    center.eventMode = "none";
    center.zIndex = 5;
    app.stage.addChild(center);
    centerRef.current = center;

    const rail = new PIXI.Container();
    rail.zIndex = 0;
    railRef.current = rail;
    app.stage.addChild(rail);
  }

  function stageBox(){
    const el = containerRef.current;
    const r = el.getBoundingClientRect();
    return { w: Math.round(r.width), h: Math.round(r.height) };
  }

  // Decide center rect based on orientation
  function centerRectFor(cur){
    const { w, h } = stageBox();
    const vertical = w <= stackAt;
    layoutModeRef.current = vertical ? "v" : "h";

    if (!vertical){
      // Horizontal rails (left/right)
      const left  = Math.max(0, cur);
      const right = Math.max(0, videos.length - cur - 1);
      const span  = (n) => (n <= 0 ? 0 : n * bandWidth + (n - 1) * bandGap);
      const leftW  = span(left)  + (left  > 0 ? innerGap : 0);
      const rightW = span(right) + (right > 0 ? innerGap : 0);
      const cx = leftW;
      const cw = Math.max(0, w - leftW - rightW);
      return { x: cx, y: 0, w: cw, h };
    }

    // Vertical rails (top/bottom)
    const top    = Math.max(0, cur);
    const bottom = Math.max(0, videos.length - cur - 1);
    const spanV  = (n) => (n <= 0 ? 0 : n * bandWidth + (n - 1) * bandGap);
    const topH    = spanV(top)    + (top    > 0 ? innerGap : 0);
    const bottomH = spanV(bottom) + (bottom > 0 ? innerGap : 0);
    const cy = topH;
    const ch = Math.max(0, h - topH - bottomH);
    return { x: 0, y: cy, w, h: ch };
  }

  function pillarRectForIndex(idx, cur){
    const { w, h } = stageBox();
    const mode = layoutModeRef.current;
    const cRect = centerRectFor(cur); // refresh mode & get rect

    if (mode === "h"){
      // Left/right pillars (vertical bands)
      const span = (n) => (n <= 0 ? 0 : n * bandWidth + (n - 1) * bandGap);
      if (idx < cur){
        const pos = idx;
        const leftRailWidth = span(cur);
        const startX = cRect.x - (leftRailWidth + (cur > 0 ? innerGap : 0));
        const x = startX + pos * (bandWidth + bandGap);
        return { x: Math.round(x), y: 0, w: bandWidth, h };
      } else if (idx > cur){
        const pos = idx - cur - 1;
        const startX = cRect.x + cRect.w + (cRect.w > 0 ? innerGap : 0);
        const x = startX + pos * (bandWidth + bandGap);
        return { x: Math.round(x), y: 0, w: bandWidth, h };
      }
      return null;
    }

    // Top/bottom pillars (horizontal bands)
    const spanV = (n) => (n <= 0 ? 0 : n * bandWidth + (n - 1) * bandGap);
    if (idx < cur){
      // top rail
      const pos = idx;
      const topRailHeight = spanV(cur);
      const startY = cRect.y - (topRailHeight + (cur > 0 ? innerGap : 0));
      const y = startY + pos * (bandWidth + bandGap);
      return { x: 0, y: Math.round(y), w, h: bandWidth };
    } else if (idx > cur){
      // bottom rail
      const pos = idx - cur - 1;
      const startY = cRect.y + cRect.h + (cRect.h > 0 ? innerGap : 0);
      const y = startY + pos * (bandWidth + bandGap);
      return { x: 0, y: Math.round(y), w, h: bandWidth };
    }
    return null;
  }

  function layoutRailFor(cur){
    const rail = railRef.current;
    if (!rail) return;
    rail.removeChildren();
    pillarsMapRef.current.clear();

    const buildPillar = (i) => {
      const r = pillarRectForIndex(i, cur);
      const sprite = PIXI.Sprite.from(videos[i].poster);
      try { sprite.texture.source.scaleMode = 'nearest'; } catch {}
      sprite.eventMode = "static";
      sprite.cursor = "pointer";
      sprite.alpha = 0.99;
      sprite.x = r.x; sprite.y = r.y; sprite.width = r.w; sprite.height = r.h;

      const filt = new PixelateColsFilter(
        bandCols,
        sprite.height / Math.max(1, sprite.width),
        pillarSaturation
      );
      sprite.filters = [filt];

      // hover intent
      sprite.on("pointerenter", () => {
        if (animatingRef.current) return;
        if (Date.now() < hoverCooldownUntilRef.current) return;
        hoverIdxRef.current = i;
        startHoverTimer(i, layoutTickRef.current);
      });
      sprite.on("pointerleave", () => {
        if (hoverIdxRef.current === i) hoverIdxRef.current = null;
        cancelHoverTimer();
      });
      // tap (mobile/desktop click)
      sprite.on("pointertap", () => {
        if (animatingRef.current) return;
        if (Date.now() < hoverCooldownUntilRef.current) return;
        trySwitch(i);
      });

      rail.addChild(sprite);
      pillarsMapRef.current.set(i, sprite);
    };

    for (let i = 0; i < cur; i++) buildPillar(i);
    for (let i = cur + 1; i < videos.length; i++) buildPillar(i);
  }

  function layoutAll(){
    const app = appRef.current;
    const center = centerRef.current;
    const rail = railRef.current;
    if (!app || !center || !rail) return;

    layoutTickRef.current++;

    // Center
    const cRect = centerRectFor(current);
    const tex = center.texture?.source;
    const tW = tex?.width || 16, tH = tex?.height || 9;
    const fit = fitContain(tW, tH, Math.round(cRect.w), Math.round(cRect.h));
    center.position.set(Math.round(cRect.x + fit.x), Math.round(cRect.y + fit.y));
    center.scale.set(fit.scaleX, fit.scaleY);

    // Rebuild rails for this mode/index
    layoutRailFor(current);
  }

  /* ----------------------- Hover Intent (safe) ------------------------ */

  function startHoverTimer(i, tickAtStart){
    cancelHoverTimer();
    hoverTimerRef.current = setTimeout(() => {
      if (tickAtStart !== layoutTickRef.current) return;
      if (hoverIdxRef.current !== i) return;
      if (animatingRef.current) return;
      if (Date.now() < hoverCooldownUntilRef.current) return;
      trySwitch(i);
    }, hoverDelayMs);
  }
  function cancelHoverTimer(){
    if (hoverTimerRef.current) { clearTimeout(hoverTimerRef.current); hoverTimerRef.current = null; }
  }

  /* ---------------------------- Pooling ------------------------------- */

  async function getVideoRecord(idx){
    if (poolRef.current.has(idx)) return poolRef.current.get(idx);
    const rec = await createStreamVideo(videos[idx].id, { autoplay: true, muted: true });
    poolRef.current.set(idx, rec);

    // keep only current ±1
    const want = new Set([current]);
    if (current - 1 >= 0) want.add(current - 1);
    if (current + 1 < videos.length) want.add(current + 1);
    for (const [k, r] of [...poolRef.current.entries()]){
      if (!want.has(k) && poolRef.current.size > 3){
        try { r.destroy?.(); } catch {}
        poolRef.current.delete(k);
      }
    }
    return rec;
  }

  async function primePool(idx){
    const wants = [idx];
    if (idx - 1 >= 0) wants.push(idx - 1);
    if (idx + 1 < videos.length) wants.push(idx + 1);
    await Promise.all(wants.map(i => getVideoRecord(i).catch(() => {})));
    setCenterTexture(idx, false);
  }

  function setCenterTexture(idx, skipLayout = false){
    const center = centerRef.current;
    const rec = poolRef.current.get(idx);
    center.texture = rec?.texture || (PIXI.Texture.from(videos[idx].poster));
    try { center.texture.source.scaleMode = 'nearest'; } catch {}
    if (!skipLayout) layoutAll();
  }

  /* --------------------------- Transition ----------------------------- */

  async function trySwitch(nextIdx){
    if (animatingRef.current || nextIdx === current) return;
    if (!centerRef.current || !railRef.current) return;

    animatingRef.current = true;
    cancelHoverTimer();
    hoverIdxRef.current = null;

    const app = appRef.current;
    const center = centerRef.current;
    const rail = railRef.current;

    // Warm incoming
    const incoming = await getVideoRecord(nextIdx);
    const currentRec = poolRef.current.get(current);

    // Current bounds & source pillar
    const cRectNow = center.getBounds();
    const srcPillar = pillarsMapRef.current.get(nextIdx);
    if (!srcPillar) { animatingRef.current = false; return; }
    const fromRect = srcPillar.getBounds();

    // FINAL rectangles computed for nextIdx's layout (sets mode too)
    const finalCRect = centerRectFor(nextIdx);
    const incSrc = incoming.texture?.source;
    const incW = incSrc?.width || 16, incH = incSrc?.height || 9;
    const fitFinal = fitContain(incW, incH, Math.round(finalCRect.w), Math.round(finalCRect.h));
    const finalTarget = {
      x: Math.round(finalCRect.x + fitFinal.x),
      y: Math.round(finalCRect.y + fitFinal.y),
      w: Math.round(fitFinal.w),
      h: Math.round(fitFinal.h),
    };
    const toRectForOutgoing = pillarRectForIndex(current, nextIdx); // current becomes a pillar in the new layout

    // Remove source pillar immediately
    try {
      srcPillar.parent?.removeChild(srcPillar);
      srcPillar.destroy({ children: true, texture: false, baseTexture: false });
    } catch {}
    pillarsMapRef.current.delete(nextIdx);

    // Freeze the rail to prevent any single-frame redraw glitches
    rail.cacheAsBitmap = true;

    // Animation sprites
    const incomingSprite = new PIXI.Sprite(incoming.texture);
    try { incomingSprite.texture.source.scaleMode = 'nearest'; } catch {}
    incomingSprite.zIndex = 10;
    incomingSprite.x = Math.round(fromRect.x); incomingSprite.y = Math.round(fromRect.y);
    incomingSprite.width = Math.round(fromRect.width); incomingSprite.height = Math.round(fromRect.height);
    app.stage.addChild(incomingSprite);

    const outgoingSprite = new PIXI.Sprite(center.texture);
    try { outgoingSprite.texture.source.scaleMode = 'nearest'; } catch {}
    outgoingSprite.zIndex = 10;
    outgoingSprite.x = Math.round(cRectNow.x); outgoingSprite.y = Math.round(cRectNow.y);
    outgoingSprite.width = Math.round(cRectNow.width); outgoingSprite.height = Math.round(cRectNow.height);
    const startCols = Math.max(12, Math.round((layoutModeRef.current === "h" ? cRectNow.width : cRectNow.height) / 28));
    const outFilt = new PixelateColsFilter(
      startCols,
      outgoingSprite.height / Math.max(1, outgoingSprite.width),
      pillarSaturation
    );
    outgoingSprite.filters = [outFilt];
    app.stage.addChild(outgoingSprite);

    // Freeze underlying video during morph
    center.visible = false;
    try { currentRec?.video?.pause?.(); } catch {}

    const ease = "cubic-bezier(.22,1,.36,1)";
    const snap = { x: 1, y: 1, width: 1, height: 1 };
    const tl = gsap.timeline({ defaults: { duration: transitionMs / 1000, ease, snap }, overwrite: "auto" });

    // Incoming pillar -> FINAL center box
    tl.to(incomingSprite, { x: finalTarget.x, y: finalTarget.y, width: finalTarget.w, height: finalTarget.h }, 0);

    // Outgoing center -> its new pillar slot
    tl.to(outgoingSprite, {
      x: Math.round(toRectForOutgoing.x),
      y: Math.round(toRectForOutgoing.y),
      width: Math.round(toRectForOutgoing.w),
      height: Math.round(toRectForOutgoing.h),
    }, 0);

    // Pixel density locks to pillar by the end
    tl.to(outFilt.uniforms, { uCols: bandCols }, 0);

    tl.add(() => {
      const ticker = app.ticker; try { ticker.stop(); } catch {}

      // Commit center to EXACT final box
      setCenterTexture(nextIdx, true);
      const tex = center.texture?.source;
      const tW = tex?.width || 16, tH = tex?.height || 9;
      center.position.set(finalTarget.x, finalTarget.y);
      center.scale.set(finalTarget.w / tW, finalTarget.h / tH);
      center.visible = true;

      // Cleanup temp sprites
      incomingSprite.destroy({ children: true, texture: false, baseTexture: false });
      outgoingSprite.destroy({ children: true, texture: false, baseTexture: false });

      // Rebuild rail for the NEW index while still paused
      layoutTickRef.current++;
      layoutRailFor(nextIdx);

      // Unfreeze the rail & resume
      rail.cacheAsBitmap = false;
      const newRec = poolRef.current.get(nextIdx);
      try { newRec?.video?.play?.(); } catch {}
      try { ticker.start(); } catch {}

      setCurrent(nextIdx);
      hoverCooldownUntilRef.current = Date.now() + hoverCooldownMs;
      animatingRef.current = false;
    });
  }

  /* ------------------------------------------------------------------- */

  const activeTitle = videos[current]?.title || "";

  return (
    <div className="videoP-root" ref={containerRef}>
      <div className="videoP-bug">{activeTitle}</div>
    </div>
  );
}
