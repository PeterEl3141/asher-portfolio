// FinParallaxDivider.jsx — phase A: parallax fins; phase B: page + fins rise together
import React, { useLayoutEffect, useRef } from "react";
import PropTypes from "prop-types";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import "./FinParallaxDivider.css";

gsap.registerPlugin(ScrollTrigger);

export default function FinParallaxDivider({
  height = 220,
  scrollDistance,                 // phase-A distance; phase-B auto = hero height
  yStartPercent = 110,
  fins = [],                      // [{ w, left, z, dur, rotate, scale, src }]
  finSrc = "/images/Fin-hero.png",
  className = "",
  containerSelector = "main",
}) {
  const anchorRef  = useRef(null);
  const overlayRef = useRef(null);
  const finRefs    = useRef([]);
  finRefs.current  = [];

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

  const afterReflow = (fn) =>
    requestAnimationFrame(() => requestAnimationFrame(fn));

  const toFixedBottom = () => {
    const el = overlayRef.current;
    if (!el) return;
    afterReflow(() => {
      if (el.parentNode !== document.body) document.body.appendChild(el);
      const r = el.getBoundingClientRect();
      const bottom = Math.max(0, window.innerHeight - r.bottom);
      gsap.set(el, {
        position: "fixed",
        left: 0,
        right: 0,
        top: "auto",
        bottom,
        width: "100%",
        y: 0,
        zIndex: 2147483647,
        pointerEvents: "none",
        overflow: "visible",
        willChange: "transform",
      });
      requestAnimationFrame(() => gsap.set(el, { bottom: 0 }));
    });
  };

  const toAbsoluteAtDocY = () => {
    const el = overlayRef.current;
    if (!el) return;
    afterReflow(() => {
      const container = getContainer();
      const r = el.getBoundingClientRect();
      const cRect = container.getBoundingClientRect();
      if (el.parentNode !== container) container.appendChild(el);
      const topWithinContainer = r.top - cRect.top;
      gsap.set(el, {
        position: "absolute",
        left: 0,
        right: 0,
        top: topWithinContainer,
        bottom: "auto",
        width: "100%",
        zIndex: 1,
        pointerEvents: "none",
        overflow: "visible",
        clearProps: "transform",
      });
    });
  };

  useLayoutEffect(() => {
    const hero = getHero();
    const overlay = overlayRef.current;
    if (!hero || !overlay) return;

    // Park overlay in-flow at the bottom of container initially
    const container = getContainer();
    if (overlay.parentNode !== container) container.appendChild(overlay);
    gsap.set(overlay, {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      top: "auto",
      width: "100%",
      y: 0,
      zIndex: 1,
      pointerEvents: "none",
      overflow: "visible",
    });

    // Phase-A: each fin rises at its own speed to the baseline
    const finsTL = gsap.timeline({ defaults: { ease: "none" } });
    finRefs.current.forEach((img, i) => {
      if (!img) return;
      const dur = typeof fins[i]?.dur === "number" ? fins[i].dur : 1;
      finsTL.fromTo(
        img,
        { yPercent: yStartPercent },
        { yPercent: 0, duration: dur },
        0
      );
    });

    // Build master TL (we’ll append Phase-B after ST exists so we can use its spacer)
    const master = gsap.timeline({ defaults: { ease: "none" } });
    master.add(finsTL, 0);

    // Scroll distances
    const phaseA = typeof scrollDistance === "number" ? scrollDistance : height * 8;
    const coverDistance = () => hero.getBoundingClientRect().height;
    const totalDistance = () => phaseA + coverDistance();

    // Create the ScrollTrigger now so we can reference its pinSpacer
    const st = ScrollTrigger.create({
      trigger: hero,
      start: "top top",
      end: () => `+=${totalDistance()}`,
      scrub: true,
      pin: hero,                 // hero pinned for both phases
      pinSpacing: true,          // we’ll animate the spacer in Phase-B
      anticipatePin: 1,
      invalidateOnRefresh: true,
      animation: master,
      onEnter: () => {
        toFixedBottom();
        hero.style.visibility = "";
      },
      onEnterBack: () => {
        toFixedBottom();
        hero.style.visibility = "";
        gsap.set(overlay, { y: 0 });   // reset overlay slide when reversing
      },
      onLeave: () => {
        toAbsoluteAtDocY();            // commit overlay in-flow
        hero.style.visibility = "hidden"; // hide hero once fully covered
      },
      onLeaveBack: () => {
        hero.style.visibility = "";
        toFixedBottom();
      },
    });

    // === Phase-B: make the PAGE rise with the fins ===
    // We shrink whatever spacing the pinSpacer uses (padding or margin) to 0
    const spacer = st.pinSpacer;
    let spaceProp = "paddingBottom";
    let spaceStart = 0;
    if (spacer) {
      const cs = getComputedStyle(spacer);
      const pt = parseFloat(cs.paddingTop);
      const pb = parseFloat(cs.paddingBottom);
      const mt = parseFloat(cs.marginTop);
      const mb = parseFloat(cs.marginBottom);
      // pick whichever currently holds the pin spacing
      if (pb > 0) { spaceProp = "paddingBottom"; spaceStart = pb; }
      else if (pt > 0) { spaceProp = "paddingTop"; spaceStart = pt; }
      else if (mb > 0) { spaceProp = "marginBottom"; spaceStart = mb; }
      else if (mt > 0) { spaceProp = "marginTop"; spaceStart = mt; }
      else { spaceProp = "paddingBottom"; spaceStart = coverDistance(); }
    }

    // Add Phase-B tweens to the same master TL so everything scrubs together
    master.to(
      overlay,
      { y: () => -coverDistance(), duration: 1 },
      finsTL.duration()
    );
    if (spacer) {
      master.to(
        spacer,
        { [spaceProp]: 0, duration: 1 },
        finsTL.duration()
      );
    }

    // When reversing back into Phase-A, restore the spacer value so layout is consistent
    st.addEventListener("enterBack", () => {
      if (spacer && spaceStart) gsap.set(spacer, { [spaceProp]: spaceStart });
    });
    st.addEventListener("refreshInit", () => {
      // keep things sane on resizes
      if (spacer && spaceStart) gsap.set(spacer, { [spaceProp]: spaceStart });
      gsap.set(overlay, { y: 0 });
      hero.style.visibility = "";
    });

    const onResize = () => ScrollTrigger.refresh();
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      st.kill();
      master.kill();
    };
  }, [height, scrollDistance, yStartPercent, fins, containerSelector]);

  return (
    <>
      {/* IMPORTANT: place this component immediately after the hero in the DOM */}
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
              transform:
                `${f.rotate ? `rotate(${f.rotate}deg)` : ""} ${f.scale ? `scale(${f.scale})` : ""}`,
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
      dur: PropTypes.number,     // controls speed in phase-A
      rotate: PropTypes.number,
      scale: PropTypes.number,
    })
  ),
};
