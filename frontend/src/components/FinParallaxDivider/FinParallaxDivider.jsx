// FinParallaxDivider.jsx — fins rise (pixel-locked) + Profile floats up on top
import React, { useLayoutEffect, useRef } from "react";
import PropTypes from "prop-types";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import "./FinParallaxDivider.css";

gsap.registerPlugin(ScrollTrigger);

export default function FinParallaxDivider({
  height = 700,
  scrollDistance = 1600,
  /** where the fin pill's baseline "locks" in the viewport (0=top, 1=bottom) */
  lockAt = 1,
  /** how far *below* the baseline fins start (as % of strip height) */
  yStartPercent = 300,
  /** variable fin specs */
  fins = [],
  finSrc = "/images/Fin-hero2.webp",
  className = "",
  containerSelector = "main",

  /** profile reveal control */
  nextTarget = "#profile",
  revealStart = 0.60,      // <-- when profile starts to appear (0..1 of the ST)
  revealEnd   = 0.85,      // <-- when it's fully in place
  liftPx      = 100,       // <-- slide-up distance while fading in
  bottomPeek  = 28,        // <-- while fixed, sit this many px above bottom
}) {
  const anchorRef   = useRef(null);
  const overlayRef  = useRef(null);
  const finRefs     = useRef([]);
  const profileSpacerRef = useRef(null); // keeps layout stable while profile is fixed

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

  // --- overlay modes (same as your last working version) ---
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
        y: -h, // align baseline (bottom of strip) to the very top of viewport
        willChange: "transform",
        force3D: true,
      });
    });
  };

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
        top: absoluteTop, // welded to the hero’s bottom edge
        bottom: "auto",
        width: "100%",
        zIndex: 1,
        pointerEvents: "none",
        overflow: "hidden", // clips the “pillars” so we don't get a full-screen slab post-pin
        y: 0,
        willChange: "transform",
        force3D: true,
      });
    });
  };

  useLayoutEffect(() => {
    const hero    = getHero();
    const overlay = overlayRef.current;
    const spacer  = profileSpacerRef.current;
    if (!hero || !overlay || !spacer) return;

    // Find the profile section in the DOM (sibling)
    const profile = typeof nextTarget === "string" ? document.querySelector(nextTarget) : null;

    // Start parked at container’s bottom (no flash)
    const container = getContainer();
    if (overlay.parentNode !== container) container.appendChild(overlay);
    gsap.set(overlay, {
      position: "absolute", left: 0, right: 0, bottom: 0, width: "100%", y: 0, overflow: "visible",
      willChange: "transform", force3D: true,
    });

    // compositor hints for fins
    gsap.set(finRefs.current, { willChange: "transform", force3D: true, z: 0 });

    // geometry helpers
    const stripH  = () => overlay.offsetHeight || height;
    const lockPx  = () => Math.max(0, Math.min(window.innerHeight, window.innerHeight * lockAt));
    const startPx = () => lockPx() + (stripH() * (yStartPercent / 100));

    // fin animation (variable durations = different “speeds”)
    const tl = gsap.timeline({ defaults: { ease: "none" } });

    finRefs.current.forEach((img, i) => {
      if (!img) return;
      const dur = typeof fins[i]?.dur === "number" ? fins[i].dur : 1;
      tl.fromTo(
        img,
        { y: () => Math.round(startPx()) }, // BELOW the viewport
        { y: () => Math.round(lockPx()), duration: dur, snap: { y: 1 }, force3D: true },
        0
      );
    });

    // pin distance
    const LOCK = typeof scrollDistance === "number" ? scrollDistance : height * 8;

    // Overlay starts fixed while hero is pinned
    toFixedTopBaseline();

    let profileFixed = false;

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

      onEnter:     () => toFixedTopBaseline(),
      onEnterBack: () => toFixedTopBaseline(),
      onLeave:     () => {
        toAbsoluteAtDocY();
        if (profile) {
          // restore profile to document flow, remove spacer
          profile.classList.remove("fpd-fixed", "is-live");
          gsap.set(profile, { clearProps: "position,left,right,top,bottom,xPercent,y,opacity,zIndex" });
          gsap.set(spacer, { height: 0 });
        }
        hero.setAttribute("data-occluded", "1");
        profileFixed = false;
      },
      onLeaveBack: () => {
        toFixedTopBaseline();
        hero.removeAttribute("data-occluded");
        if (profile) {
          profile.classList.remove("fpd-fixed", "is-live");
          gsap.set(profile, { clearProps: "position,left,right,top,bottom,xPercent,y,opacity,zIndex" });
          gsap.set(spacer, { height: 0 });
        }
        profileFixed = false;
      },

      onUpdate: (self) => {
        const p  = self.progress || 0;
        const rs = Math.max(0, Math.min(0.98, revealStart));
        const re = Math.max(rs + 0.02, Math.min(1, revealEnd));
        const t  = gsap.utils.clamp(0, 1, (p - rs) / Math.max(0.0001, re - rs)); // 0..1 only in [rs..re]

        // Keep hero from reappearing once we start revealing
        if (p >= rs) hero.setAttribute("data-occluded", "1");
        else hero.removeAttribute("data-occluded");

        if (!profile) return;

        // the instant reveal starts, float profile OVER the fins
        if (t > 0 && !profileFixed) {
          // reserve its height so no layout jump when we take it out of flow
          const ph = Math.max(1, profile.getBoundingClientRect().height || profile.offsetHeight || 1);
          gsap.set(spacer, { height: ph });

          profile.classList.add("fpd-fixed");
          gsap.set(profile, {
            position: "fixed",
            left: "50%", xPercent: -50,
            bottom: bottomPeek,
            y: liftPx,
            opacity: 0,
            zIndex: 2147483650, // above the overlay
            pointerEvents: "auto",
            willChange: "transform,opacity",
          });

          profileFixed = true;
        }

        if (profileFixed) {
          // slide up + fade in during [rs..re]
          gsap.set(profile, { y: (1 - t) * liftPx, opacity: t });
          // kick your text unfurl class a touch later
          profile.classList.toggle("is-live", t > 0.15);
        }
      },
    });

    const onResize = () => {
      // keep offsets sensible when viewport changes
      ScrollTrigger.refresh();
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      st.kill();
      tl.kill();
    };
  }, [
    height, scrollDistance, yStartPercent, fins, containerSelector, lockAt,
    nextTarget, revealStart, revealEnd, liftPx, bottomPeek
  ]);

  return (
    <>
      {/* tiny anchor right under the hero */}
      <div ref={anchorRef} className="finpxd__anchor" aria-hidden />
      {/* fin overlay */}
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

      {/* spacer that holds the place of #profile while it's fixed */}
      <div ref={profileSpacerRef} className="fpd__spacer" aria-hidden />
    </>
  );
}

FinParallaxDivider.propTypes = {
  height: PropTypes.number,
  scrollDistance: PropTypes.number,
  yStartPercent: PropTypes.number,
  lockAt: PropTypes.number,
  finSrc: PropTypes.string,
  className: PropTypes.string,
  containerSelector: PropTypes.string,
  fins: PropTypes.arrayOf(
    PropTypes.shape({
      src: PropTypes.string,
      w: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
      left: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
      z: PropTypes.number,
      dur: PropTypes.number,   // <-- controls relative “speed”
      rotate: PropTypes.number,
      scale: PropTypes.number,
    })
  ),
  nextTarget: PropTypes.string,
  revealStart: PropTypes.number,
  revealEnd: PropTypes.number,
  liftPx: PropTypes.number,
  bottomPeek: PropTypes.number,
};
