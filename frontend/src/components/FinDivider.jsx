import React, { useEffect, useMemo, useRef, useState } from "react";
import "./FinDivider.css";

/**
 * Classic FinDivider + optional horizontal scroll-linked drift.
 *
 * Props you already had:
 *  - src, tileWidth, overlap, tileHeight
 *  - mount: "none" | "lower" | "upper"
 *  - offset
 *  - autoScroll (CSS marquee), durationSec
 *
 * NEW (optional):
 *  - scrollLinked (boolean) default false  -> move only when user scrolls
 *  - speedX (number)        default 0.25  -> px shift in X per 1px scroll
 */
export default function FinDivider({
  src,
  tileWidth,
  overlap,
  tileHeight,
  mount = "none",
  offset = 0,
  className = "",
  style,
  alt = "fin divider tile",
  autoScroll = false,
  durationSec = 20,
  // NEW:
  scrollLinked = false,
  speedX = 1.5,
}) {
  const rootRef = useRef(null);
  const trackRef = useRef(null);
  const [containerW, setContainerW] = useState(0);

  const step = Math.max(1, tileWidth - overlap); // effective repeat distance

  const tileCount = useMemo(() => {
    if (containerW <= 0) return 0;
    return Math.ceil((containerW + tileWidth * 2) / step) + 2;
  }, [containerW, step, tileWidth]);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    const measure = () => {
      const r = el.getBoundingClientRect();
      const w =
        r.width ||
        el.offsetWidth ||
        (el.parentElement && el.parentElement.getBoundingClientRect().width) ||
        window.innerWidth;
      setContainerW(Math.max(1, Math.round(w)));
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    const id = requestAnimationFrame(measure);
    window.addEventListener("resize", measure);

    return () => {
      cancelAnimationFrame(id);
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  // Absolute anchoring (classic)
  let anchorClass = "";
  let anchorStyle = {};
  if (mount === "lower") {
    anchorClass = "fin-divider--abs";
    anchorStyle = { top: -(tileHeight || 0) + (offset || 0) };
  } else if (mount === "upper") {
    anchorClass = "fin-divider--abs";
    anchorStyle = { bottom: -(tileHeight || 0) + (offset || 0) };
  }

  // NEW: horizontal scroll-linked drift (no GSAP)
  useEffect(() => {
    if (!scrollLinked || !trackRef.current) return;

    // Respect reduced-motion users
    const reduced =
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    let raf = 0;
    const update = () => {
      raf = 0;
      const s = window.scrollY || window.pageYOffset || 0;
      // wrap by one "step" so seams stay seamless
      const x = -((s * speedX) % step);
      trackRef.current.style.transform = `translate3d(${x}px, 0, 0)`;
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    update(); // initial
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [scrollLinked, speedX, step]);

  const Strip = ({ keyPrefix = "a" }) => (
    <div className="fin-divider__strip" style={{ height: tileHeight || "auto" }}>
      {Array.from({ length: tileCount }).map((_, i) => (
        <img
          key={`${keyPrefix}-${i}`}
          src={src}
          alt={alt}
          className="fin-divider__tile"
          style={{
            width: `${tileWidth}px`,
            height: tileHeight ? `${tileHeight}px` : "auto",
            marginLeft: i === 0 ? 0 : `-${overlap}px`,
          }}
          draggable={false}
        />
      ))}
    </div>
  );

  return (
    <div
      ref={rootRef}
      className={`fin-divider ${anchorClass} ${className}`}
      style={{ ...style, ...anchorStyle, "--fin-duration": `${durationSec}s` }}
      aria-hidden="true"
    >
      <div
        ref={trackRef}
        className={`fin-divider__track ${autoScroll ? "is-scrolling" : ""}`}
      >
        <Strip keyPrefix="a" />
        {/* autoScroll still works exactly like before */}
        {autoScroll && <Strip keyPrefix="b" />}
      </div>
    </div>
  );
}
