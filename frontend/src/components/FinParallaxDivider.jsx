// FinParallaxDivider.jsx  (patched: no-jump handoff + unified rise)
import React, { useLayoutEffect, useRef } from "react";
import PropTypes from "prop-types";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import "./FinParallaxDivider.css";

gsap.registerPlugin(ScrollTrigger);

export default function FinParallaxDivider({
  height = 200,
  scrollDistance,
  yStartPercent = 110,
  fins = [],
  finSrc = "/images/Fin-hero.png",
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

  // Stage A: overlay fixed to viewport bottom so fins rise over the video.
  const toFixedBottom = () => {
    const el = overlayRef.current;
    if (!el) return;

    afterReflow(() => {
      const r = el.getBoundingClientRect(); // measure after pin spacer exists
      if (el.parentNode !== document.body) document.body.appendChild(el);
      const bottom = Math.max(0, window.innerHeight - r.bottom);

      gsap.set(el, {
        position: "fixed",
        left: 0, right: 0,
        top: "auto", bottom,
        width: "100%",
        zIndex: 2147483647,
        pointerEvents: "none",
        overflow: "visible",
      });
      requestAnimationFrame(() => gsap.set(el, { bottom: 0 }));
    });
  };

  // Stage B: snap overlay to the hero's bottom *inside the container* so it scrolls WITH the page.
  const toAbsoluteAtDocY = () => {
    const el   = overlayRef.current;
    const hero = getHero();
    if (!el || !hero) return;

    afterReflow(() => {
      const container = getContainer();
      if (el.parentNode !== container) container.appendChild(el);

      // Compute absolute top relative to container so the overlay's baseline
      // sits exactly on the hero's bottom (no seam/gap).
      const cRect = container.getBoundingClientRect();
      const hRect = hero.getBoundingClientRect();
      const overlayH = el.offsetHeight || height;

      const absoluteTop = Math.round(hRect.bottom - cRect.top - overlayH);

      gsap.set(el, {
        position: "absolute",
        left: 0, right: 0,
        top: absoluteTop,         // <- locked to hero bottom
        bottom: "auto",
        width: "100%",
        zIndex: 1,
        pointerEvents: "none",
        overflow: "visible",
      });
    });
  };

  useLayoutEffect(() => {
    const hero = getHero();
    if (!hero || !overlayRef.current) return;

    // Start parked at the container's bottom edge (in flow).
    const container = getContainer();
    if (overlayRef.current.parentNode !== container) container.appendChild(overlayRef.current);
    gsap.set(overlayRef.current, {
      position: "absolute", left: 0, right: 0, bottom: 0, width: "100%"
    });

    // Parallax fins: different durations = different speeds.
    const tl = gsap.timeline({ defaults: { ease: "none" } });
    finRefs.current.forEach((img, i) => {
      if (!img) return;
      const dur = typeof fins[i]?.dur === "number" ? fins[i].dur : 1;
      tl.fromTo(img, { yPercent: yStartPercent }, { yPercent: 0, duration: dur }, 0);
    });

    // How long the hero stays pinned (Stage A).
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
      onEnter:     toFixedBottom,
      onEnterBack: toFixedBottom,
      onLeave:     toAbsoluteAtDocY, // <- unified rise begins here
      onLeaveBack: toFixedBottom,
    });

    const onResize = () => ScrollTrigger.refresh();
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      st.kill();
      tl.kill();
    };
  }, [height, scrollDistance, yStartPercent, fins, containerSelector]);

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
  yStartPercent: PropTypes.number,
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
