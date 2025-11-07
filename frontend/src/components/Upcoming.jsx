import React, { useEffect, useRef, useState } from "react";
import "./Upcoming.css";

export default function Upcoming() {
  const [heroY, setHeroY] = useState(0);
  const sectionRef = useRef(null);

  // Parallax for the massive "UPCOMING" word
  useEffect(() => {
    const handleScroll = () => {
      if (!sectionRef.current) return;
      const rect = sectionRef.current.getBoundingClientRect();
      const visible = rect.top < window.innerHeight && rect.bottom > 0;
      if (!visible) return;

      const factor = 0.35; // moves slower than page scroll
      const delta = -rect.top;
      setHeroY(delta * factor);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, []);

  return (
    <section className="upcoming-section" ref={sectionRef}>
      {/* Massive background word with parallax */}
      <div
        className="upcoming-hero-word"
        aria-hidden
        style={{ transform: `translate3d(0, ${heroY}px, 0)` }}
      >
        UPCOMING
      </div>

      {/* Big central visual */}
      <div className="upcoming-main">
        <img
          src="/images/florence.png"
          alt="Upcoming — trailer artwork"
          className="upcoming-main-img"
        />
      </div>
      <p className="upcoming-title">Small Gods</p>

    </section>
  );
}
