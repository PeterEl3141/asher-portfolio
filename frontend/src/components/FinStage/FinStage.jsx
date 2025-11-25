// FinStage.jsx — stable version: fins rise, blackout, then next section.
import React, { useLayoutEffect, useRef } from "react";
import PropTypes from "prop-types";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import "./FinStage.css";

gsap.registerPlugin(ScrollTrigger);

export default function FinStage({
  height = 700,              // fin strip height in px
  scrollDistance = 1600,     // how long the hero is pinned
  yStartPercent = 300,       // fins start this far BELOW the lock baseline (as % of strip height)
  lockAt = 1,                // 0 = top, 1 = bottom of viewport
  fins = [],
  finSrc = "/images/Fin-hero2.webp",
  className = "",
  containerSelector = "main",
}) {
  const anchorRef  = useRef(null);
  const overlayRef = useRef(null);
  const finRefs    = useRef([]);

  const unit = (v) => (typeof v === "number" ? `${v}vw` : v);

  const getHero = () => {
    const a = anchorRef.current;
    if (!a) return null;
    // the hero is the element right before the anchor in the DOM
    let el = a.previousElementSibling;
    while (el && el.nodeType !== 1) el = el.previousSibling;
    return el || null;
  };

  const getContainer = () => {
    const c = document.querySelector(containerSelector) || document.body;
    if (getComputedStyle(c).position === "static") c.style.position = "relative";
    return c;
  };

  // Put overlay into fixed mode with its baseline welded to the top edge.
  const toFixedTopBaseline = () => {
  const el = overlayRef.current;
  if (!el) return;

  // stay inside the same container as hero/profile (main)
  const container = getContainer();
  if (el.parentNode !== container) container.appendChild(el);

  const h = el.offsetHeight || height;

  gsap.set(el, {
    position: "fixed",
    left: 0,
    right: 0,
    top: 0,
    bottom: "auto",
    width: "100%",
    y: -h, // baseline at top edge
    overflow: "visible",
    willChange: "transform",
    pointerEvents: "none",
    zIndex: 5,         // <<< no longer “god mode”
    force3D: true,
  });
};


  // After the pin, park the strip exactly under the hero (no jump).
  const toAbsoluteAtDocY = () => {
    const el = overlayRef.current;
    const hero = getHero();
    if (!el || !hero) return;

    const container = getContainer();
    if (el.parentNode !== container) container.appendChild(el);

    const cRect = container.getBoundingClientRect();
    const hRect = hero.getBoundingClientRect();
    const overlayH = el.offsetHeight || height;
    // place so the overlay baseline kisses the hero bottom
    const absoluteTop = Math.round(hRect.bottom - cRect.top - overlayH);

    gsap.set(el, {
      position: "absolute",
      left: 0, right: 0,
      top: absoluteTop,
      bottom: "auto",
      width: "100%",
      y: 0,
      overflow: "hidden",
      willChange: "transform",
      pointerEvents: "none",
      zIndex: 1,
      force3D: true,
    });
  };

  useLayoutEffect(() => {
    const hero    = getHero();
    const overlay = overlayRef.current;
    if (!hero || !overlay) return;

    // Ensure overlay starts in the container so size is correct,
    // then immediately switch to fixed onEnter.
    const container = getContainer();
    container.style.setProperty("--fin-gap", `${scrollDistance}px`);
    if (overlay.parentNode !== container) container.appendChild(overlay);
    gsap.set(overlay, { position: "absolute", left: 0, right: 0, bottom: 0, width: "100%" });

    // GPU/compositor hints
    gsap.set(finRefs.current, { willChange: "transform", force3D: true, z: 0 });

    // Helpers based on live sizes
    const stripH  = () => overlay.offsetHeight || height;
    const lockPx  = () => Math.max(0, Math.min(window.innerHeight, window.innerHeight * lockAt));
    const startPx = () => lockPx() + (stripH() * (yStartPercent / 100));

    // Timeline: every fin rises from deep below up to the lock line.
    const tl = gsap.timeline({ defaults: { ease: "none" } });
    finRefs.current.forEach((img, i) => {
      if (!img) return;
      const dur = typeof fins[i]?.dur === "number" ? fins[i].dur : 1;
      tl.fromTo(
        img,
        { y: () => Math.round(startPx()) },
        { y: () => Math.round(lockPx()), duration: dur, snap: { y: 1 }, force3D: true },
        0
      );
    });

    const st = ScrollTrigger.create({
      trigger: hero,
      start: "top top",
      end: `+=${scrollDistance}`,
      scrub: true,
      pin: hero,
      pinSpacing: true,
      anticipatePin: 1,
      invalidateOnRefresh: true,
      animation: tl,

      onEnter:     () => { toFixedTopBaseline(); hero.removeAttribute("data-occluded"); },
      onEnterBack: () => { toFixedTopBaseline(); hero.removeAttribute("data-occluded"); },
      onLeave:     () => { toAbsoluteAtDocY();  hero.setAttribute("data-occluded","1"); },
      onLeaveBack: () => { toFixedTopBaseline(); hero.removeAttribute("data-occluded"); },
    });

    const onResize = () => ScrollTrigger.refresh();
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      st.kill();
      tl.kill();
    };
  }, [height, scrollDistance, yStartPercent, lockAt, containerSelector, fins]);

  return (
    <>
      {/* anchor: place this immediately AFTER <HeroVideo/> in the DOM */}
      <div ref={anchorRef} className="finpxd__anchor" aria-hidden />
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
            decoding="async"
            loading="eager"
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

FinStage.propTypes = {
  height: PropTypes.number,
  scrollDistance: PropTypes.number,
  yStartPercent: PropTypes.number,
  lockAt: PropTypes.number,
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
  finSrc: PropTypes.string,
  className: PropTypes.string,
  containerSelector: PropTypes.string,
};
