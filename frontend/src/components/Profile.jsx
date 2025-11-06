import React, { useRef, useEffect, useState } from "react";
import "./Profile.css";

const Profile = () => {
  const sectionRef = useRef(null);
  const textRef = useRef(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    // If user prefers reduced motion, just show immediately.
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShow(true);
      return;
    }

    let observer;
    let rafId = null;
    let revealed = false;

    const reveal = () => {
      if (!revealed) {
        revealed = true;
        setShow(true);
        if (observer) observer.disconnect();
        if (rafId) cancelAnimationFrame(rafId);
      }
    };

    // SAFETY: if the observer never fires for any reason (layout, browser quirks),
    // auto-reveal after 2.2s.
    const safetyTimer = setTimeout(reveal, 25000);

    // Create the observer after layout paints
    rafId = requestAnimationFrame(() => {
      if (!textRef.current) return reveal();

      observer = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            if (e.isIntersecting || e.intersectionRatio > 0) {
              reveal();
              break;
            }
          }
        },
        {
          // Trigger when even a tiny bit is visible, but
          // pretend the bottom of the viewport is ~25% higher so it fires sooner.
          threshold: [0, 0.01, 0.1, 0.2],
          root: null,
          rootMargin: "0px 0px -5% 0px",
        }
      );

      observer.observe(textRef.current);
    });

    return () => {
      clearTimeout(safetyTimer);
      if (observer) observer.disconnect();
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      className={`profile ${show ? "is-inview" : ""}`}
      role="region"
      aria-label="Profile"
    >
      <div className="profile-left">
        <img src="/images/profile-pic.jpg" alt="Portrait" />
      </div>

      <div className="profile-right">
        <div ref={textRef} className="text-reveal">
          <p>
            Asher Rosen is a director, cinematographer, and editor based in London
            and Kisoro. In 2021, Asher directed his debut short film, MEAT, produced
            by Scala Productions. Meat won multiple awards, culminating in a selection
            for the César Académie’s ‘Golden Nights’ Programme. Asher’s second short
            film THE RABBI’S SON (2022) won the Pears Short Film Fund, before playing
            at a number of BAFTA/Oscar qualifying festivals.
          </p>
          <p>
            In 2023, Asher began production on his debut feature film, SMALL GODS,
            produced by Sovereign Films. Small Gods is currently in post-production
            and slated for release in 2025.
          </p>
        </div>
      </div>
    </section>
  );
};

export default Profile;
