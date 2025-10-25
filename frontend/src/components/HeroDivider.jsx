import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import PropTypes from "prop-types";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import "./HeroDivider.css";

gsap.registerPlugin(ScrollTrigger);

export default function HeroDivider({
  overlap = 40,
  speed = 60,
  startingPoint = 0,
  bleed,                 // defaults to height
  height = 200,
  className = "",
}) {
  const finSrc = useMemo(() => "/images/Fin-hero.png", []);

  // state/metrics
  const [mounted, setMounted] = useState(false);
  const [finMetrics, setFinMetrics] = useState({ step: 300, ready: false });
  const [finCount, setFinCount] = useState(12);

  // refs
  const overlayRef   = useRef(null);   // fixed overlay (visible only during pin)
  const motionRef    = useRef(null);   // vertical y tween in overlay
  const railOverlay  = useRef(null);   // marquee rail in overlay
  const railStatic   = useRef(null);   // marquee rail in static strip
  const staticRef    = useRef(null);   // in-flow static strip (sits between HeroVideo & Profile)

  // tweens
  const overlayMarqueeRef = useRef(null);
  const staticMarqueeRef  = useRef(null);
  const riseRef           = useRef(null);

  useEffect(() => { if (typeof window !== "undefined") setMounted(true); }, []);

  // measure image to derive step = finWidth - overlap
  useEffect(() => {
    let alive = true;
    const img = new Image();
    img.onload = () => {
      if (!alive) return;
      const scale = height / img.naturalHeight;
      const finWidth = img.naturalWidth * scale;
      const step = Math.max(16, Math.floor(finWidth - overlap));
      setFinMetrics({ step, ready: true });
      requestAnimationFrame(() => ScrollTrigger.refresh());
    };
    img.src = finSrc;
    return () => { alive = false; };
  }, [finSrc, height, overlap]);

  // compute how many fins to cover viewport (+buffer)
  useEffect(() => {
    if (!finMetrics.ready) return;
    const recalc = () => {
      const per = Math.max(1, Math.ceil(window.innerWidth / finMetrics.step));
      setFinCount(per + 4);
    };
    recalc();
    window.addEventListener("resize", recalc);
    return () => window.removeEventListener("resize", recalc);
  }, [finMetrics]);

  // helper to start a marquee on a given rail
  function startMarquee(nodeRef, tweenRef) {
    if (!nodeRef.current || !finMetrics.ready) return;
    const step = finMetrics.step;
    const duration = step / Math.max(1, speed);
    if (tweenRef.current) tweenRef.current.kill();
    tweenRef.current = gsap.to(nodeRef.current, {
      x: `-=${step}`,
      duration,
      ease: "none",
      repeat: -1,
      modifiers: { x: (x) => ((parseFloat(x) || 0) % step) + "px" },
    });
  }

  // spin both marquees (overlay + static)
  useLayoutEffect(() => {
    startMarquee(railOverlay, overlayMarqueeRef);
    startMarquee(railStatic, staticMarqueeRef);
    return () => {
      overlayMarqueeRef.current?.kill();
      staticMarqueeRef.current?.kill();
      overlayMarqueeRef.current = null;
      staticMarqueeRef.current = null;
    };
  }, [finMetrics, speed]);

  // find the correct pin target = element BEFORE our static strip
  function getPinTargetFromDOM() {
    const node = staticRef.current;
    if (!node) return null;
    let prev = node.previousElementSibling;
    // skip non-elements just in case
    while (prev && prev.nodeType !== 1) prev = prev.previousSibling;
    if (prev && prev !== document.documentElement && prev !== document.body) {
      const h = prev.getBoundingClientRect().height;
      if (h > 0) return prev;
    }
    return null;
  }

  // pin + rise + visibility swap
  useLayoutEffect(() => {
    if (!mounted) return;

    const pinDistance = typeof bleed === "number" ? bleed : height; // default: full strip height
    const pinEl = getPinTargetFromDOM();
    if (!pinEl || !overlayRef.current || !motionRef.current || !staticRef.current) return;

    const showOverlay = () => gsap.set(overlayRef.current, { autoAlpha: 1 });
    const hideOverlay = () => gsap.set(overlayRef.current, { autoAlpha: 0 });
    const showStatic  = () => gsap.set(staticRef.current,  { autoAlpha: 1 });
    const hideStatic  = () => gsap.set(staticRef.current,  { autoAlpha: 0 });

    // initial states
    hideOverlay();
    // keep static in layout (provides spacing) but visually hidden during the rise
    gsap.set(staticRef.current, { autoAlpha: 0 });
    gsap.set(motionRef.current, { y: pinDistance });

    riseRef.current?.kill();
    riseRef.current = gsap.fromTo(
      motionRef.current,
      { y: pinDistance },
      {
        y: 0,
        ease: "none",
        scrollTrigger: {
          trigger: pinEl,
          start: `top+=${startingPoint} top`,
          end: `+=${pinDistance}`,
          scrub: true,
          pin: pinEl,
          pinSpacing: false,         // <-- IMPORTANT: static strip already supplies spacing
          anticipatePin: 1,
          invalidateOnRefresh: true,

          onEnter:     () => { showOverlay(); hideStatic(); },
          onEnterBack: () => { showOverlay(); hideStatic(); },
          onLeave:     () => { hideOverlay(); showStatic(); },
          onLeaveBack: () => { showOverlay(); hideStatic(); },

          // ensure correct visibility on refresh or mid-load
          onToggle: (self) => {
            if (self.isActive) { showOverlay(); hideStatic(); }
            else if (self.progress >= 1) { hideOverlay(); showStatic(); }
            else { hideOverlay(); showStatic(); /* before start: show static so layout looks normal */ }
          },
        },
      }
    );

    const onResize = () => ScrollTrigger.refresh();
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      riseRef.current?.kill();
      riseRef.current = null;
    };
  }, [mounted, startingPoint, bleed, height]);

  // --- renders ---

  // in-flow static strip that stays after the rise completes
  const staticStrip = (
    <div
      ref={staticRef}
      className={className}
      aria-hidden="true"
      style={{
        width: "100%",
        height: `${height}px`,
        background: "var(--bg)",   // should match next section bg for seamless seam
        overflow: "hidden",
        pointerEvents: "none",
        opacity: 1,                // visibility controlled by autoAlpha
        visibility: "visible",
      }}
    >
      <div
        ref={railStatic}
        className="hero-divider__rail"
        style={{
          position: "relative",
          display: "flex",
          alignItems: "flex-end",
          height: "100%",
          ["--fin-overlap"]: `${overlap}px`,
          willChange: "transform",
        }}
      >
        {Array.from({ length: finCount }).map((_, i) => (
          <img
            key={`s${i}`}
            src={finSrc}
            alt=""
            aria-hidden="true"
            className="hero-divider__fin"
            style={{
              marginLeft: i === 0 ? 0 : `calc(-1 * var(--fin-overlap))`,
              height: `${height}px`,
              width: "auto",
              userSelect: "none",
            }}
            draggable={false}
          />
        ))}
      </div>
    </div>
  );

  // fixed overlay used only during the rise
  const overlay = (
    <div
      ref={overlayRef}
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: "auto 0 0 0",
        height: `${height}px`,
        background: "transparent",
        zIndex: 2147483647,
        pointerEvents: "none",
        overflow: "hidden",
        visibility: "hidden",
        opacity: 0,
        willChange: "opacity, visibility",
      }}
    >
      <div
        ref={motionRef}
        style={{
          position: "absolute",
          left: 0,
          bottom: 0,
          width: "100%",
          height: `${height}px`,
          willChange: "transform",
        }}
      >
        <div
          ref={railOverlay}
          className="hero-divider__rail"
          style={{
            position: "absolute",
            left: 0,
            bottom: 0,
            display: "flex",
            alignItems: "flex-end",
            height: "100%",
            ["--fin-overlap"]: `${overlap}px`,
            willChange: "transform",
          }}
        >
          {Array.from({ length: finCount }).map((_, i) => (
            <img
              key={`o${i}`}
              src={finSrc}
              alt=""
              aria-hidden="true"
              className="hero-divider__fin"
              style={{
                marginLeft: i === 0 ? 0 : `calc(-1 * var(--fin-overlap))`,
                height: `${height}px`,
                width: "auto",
                userSelect: "none",
              }}
              draggable={false}
            />
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {staticStrip}                               {/* occupies layout & remains after pin */}
      {mounted ? createPortal(overlay, document.body) : null}
    </>
  );
}

HeroDivider.propTypes = {
  overlap: PropTypes.number,
  speed: PropTypes.number,
  startingPoint: PropTypes.number,
  bleed: PropTypes.number,
  height: PropTypes.number,
  className: PropTypes.string,
};
