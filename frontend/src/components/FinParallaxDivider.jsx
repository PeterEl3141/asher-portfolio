// FinParallaxDivider.jsx  (lock line + pixel-controlled rise)
import React, { useLayoutEffect, useRef } from "react";
import PropTypes from "prop-types";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import "./FinParallaxDivider.css";

gsap.registerPlugin(ScrollTrigger);

export default function FinParallaxDivider({
  height = 200,
  scrollDistance,
  /** How far below the lock line fins start, as % of the strip height.
   *  Bigger number => start further off-screen. */
  yStartPercent = 110,
  /** 0 = top of viewport, 1 = bottom. 0.5 = halfway up (your request). */
  lockAt = 0,
  fins = [],
  finSrc = "/images/Fin-hero2.png",
  className = "",
  containerSelector = "main",
}) {
  const anchorRef  = useRef(null);
  const overlayRef = useRef(null);
  const finRefs    = useRef([]);
  finRefs.current = [];

  const unit = (v) => (typeof v === "number" ? `${v}vw` : v);

  const getHero = () => {
    const a = anchorRef.current;
    if (!a) return null;
    let el = a.previousElementSibling;
    while (el && el.nodeType !== 1) el = el.previousSibling;
    return el || null;
  };

  const getContainer = () => {
    const c = document.querySelector(containerSelector) || document.body;
    if (getComputedStyle(c).position === "static") c.style.position = "relative";
    return c;
  };

  const afterReflow = (fn) => requestAnimationFrame(() => requestAnimationFrame(fn));

  // -------- Stage A: overlay fixed so fins rise over the video --------
  // We fix the overlay to the TOP and shift it up by its own height so the
  // overlay's baseline (its bottom edge) sits exactly on the TOP edge.
  const toFixedTopBaseline = () => {
    const el = overlayRef.current;
    if (!el) return;

    afterReflow(() => {
      if (el.parentNode !== document.body) document.body.appendChild(el);
      const h = el.offsetHeight || height;

      gsap.set(el, {
        position: "fixed",
        left: 0, right: 0,
        top: 0,
        bottom: "auto",
        width: "100%",
        zIndex: 2147483647,
        pointerEvents: "none",
        overflow: "visible",
        y: -h, // baseline at the very top edge
      });
    });
  };

  // -------- Stage B: park overlay back in-flow under the hero --------
  const toAbsoluteAtDocY = () => {
    const el   = overlayRef.current;
    const hero = getHero();
    if (!el || !hero) return;

    afterReflow(() => {
      const container = getContainer();
      if (el.parentNode !== container) container.appendChild(el);

      const cRect = container.getBoundingClientRect();
      const hRect = hero.getBoundingClientRect();
      const overlayH = el.offsetHeight || height;
      const absoluteTop = Math.round(hRect.bottom - cRect.top - overlayH);

      gsap.set(el, {
        position: "absolute",
        left: 0, right: 0,
        top: absoluteTop,   // welded to the hero's bottom
        bottom: "auto",
        width: "100%",
        zIndex: 1,
        pointerEvents: "none",
        overflow: "visible",
        // NOTE: keep the fin 'y' transforms — we WANT them to stay at lock line.
      });
    });
  };

  useLayoutEffect(() => {
    const hero = getHero();
    const overlay = overlayRef.current;
    if (!hero || !overlay) return;

    // Start parked at container’s bottom (no flash)
    const container = getContainer();
    if (overlay.parentNode !== container) container.appendChild(overlay);
    gsap.set(overlay, {
      position: "absolute", left: 0, right: 0, bottom: 0, width: "100%", y: 0
    });

    // Helpers that recompute on refresh/resize
    const stripH = () => overlay.offsetHeight || height;
    const lockPx = () => Math.max(0, Math.min(window.innerHeight, window.innerHeight * lockAt));
    const startPx = () => lockPx() + (stripH() * (yStartPercent / 100));

    // Build timeline: we animate each fin's pixel translate 'y' from startPx to lockPx.
    // Using function-based values keeps everything correct on refresh/resize.
    const tl = gsap.timeline({ defaults: { ease: "none" } });
    finRefs.current.forEach((img, i) => {
      if (!img) return;
      const dur = typeof fins[i]?.dur === "number" ? fins[i].dur : 1;

      tl.fromTo(
        img,
        { y: () => startPx() },
        { y: () => lockPx(), duration: dur },
        0
      );
    });

    // How long the hero is pinned while fins rise.
    const LOCK = typeof scrollDistance === "number" ? scrollDistance : height * 8;

    const st = ScrollTrigger.create({
      trigger: hero,
      start: "top top",
      end: `+=${LOCK}`,
      scrub: true,
      pin: hero,
      pinSpacing: true,
      anticipatePin: 1,
      invalidateOnRefresh: true,
      animation: tl,
      onEnter:     toFixedTopBaseline,
      onEnterBack: toFixedTopBaseline,
      onLeave:     toAbsoluteAtDocY,   // unified rise resumes with page
      onLeaveBack: toFixedTopBaseline,
    });

    const onResize = () => ScrollTrigger.refresh();
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      st.kill();
      tl.kill();
    };
  }, [height, scrollDistance, yStartPercent, fins, containerSelector, lockAt]);

  return (
    <>
      <div ref={anchorRef} aria-hidden style={{ height: 0 }} />
      <div
        ref={overlayRef}
        className={`finpxd__overlay ${className}`}
        style={{ height: `${height}px` }}
        aria-hidden="true"
      >
        <div className="finpxd__baseline" />
        {fins.map((f, i) => (
          <img
            key={i}
            ref={(el) => (finRefs.current[i] = el)}
            className="finpxd__img"
            src={f.src || finSrc}
            alt=""
            draggable="false"
            style={{
              width: unit(f.w),
              left: unit(f.left),
              zIndex: f.z ?? 1,
              transform: `${f.rotate ? `rotate(${f.rotate}deg)` : ""} ${f.scale ? `scale(${f.scale})` : ""}`,
            }}
          />
        ))}
      </div>
    </>
  );
}

FinParallaxDivider.propTypes = {
  height: PropTypes.number,
  scrollDistance: PropTypes.number,
  yStartPercent: PropTypes.number,   // controls how far below the lock line fins start
  lockAt: PropTypes.number,          // 0..1 position in viewport (0=top, 0.5=middle, 1=bottom)
  finSrc: PropTypes.string,
  className: PropTypes.string,
  containerSelector: PropTypes.string,
  fins: PropTypes.arrayOf(
    PropTypes.shape({
      src: PropTypes.string,
      w: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
      left: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
      z: PropTypes.number,
      dur: PropTypes.number,
      rotate: PropTypes.number,
      scale: PropTypes.number,
    })
  ),
};
