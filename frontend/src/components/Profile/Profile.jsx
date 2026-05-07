import React, { useRef, useEffect, useState } from "react";
import "./Profile.css";

const Profile = () => {
  const sectionRef = useRef(null);
  const textRef = useRef(null);
  const [show, setShow] = useState(false);

useEffect(() => {
  const target = textRef.current;
  if (!target) return;

  // Respect reduced-motion: show immediately, no animation
  if (
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    setShow(true);
    return;
  }

  const handleScroll = () => {
    const rect = target.getBoundingClientRect();
    const vh =
      window.innerHeight || document.documentElement.clientHeight;

    // Only trigger when the text block is nicely in view:
    // - its top is above ~70% of the viewport height
    // - its bottom is below ~20% of the viewport height
    const topVisibleEnough = rect.top < vh * 0.7;
    const bottomStillOnScreen = rect.bottom > vh * 0.2;

    if (topVisibleEnough && bottomStillOnScreen) {
      setShow(true);
      window.removeEventListener("scroll", handleScroll);
    }
  };

  // Check once in case user reloads while already scrolled
  handleScroll();

  window.addEventListener("scroll", handleScroll, { passive: true });

  return () => window.removeEventListener("scroll", handleScroll);
}, []);


  return (
    <section
      id="profile"
      ref={sectionRef}
      className="profile lift-after-hero"
      role="region"
      aria-label="Profile"
    >
      <div className="profile-left">
        <img src="/images/profile-pic.jpg" alt="Portrait" />
      </div>

      <div className="profile-right">
        <div ref={textRef} className={`text-reveal ${show ? "is-inview" : ""}`}>
          <div className="text-reveal__inner">
            <p>Asher Rosen is a director, cinematographer, and editor based in London. In 2021, Asher directed his debut short film, MEAT, produced by Scala Productions. Meat won multiple awards, culminating in a selection for the César Académie’s ‘Golden Nights’ Programme. Asher’s second short film THE RABBI’S SON (2022) won the Pears Short Film Fund, playing BAFTA/Oscar qualifying festivals such as Rhode Island and Athens.</p>
            <p>In 2024, Asher began production on his debut feature film, SMALL GODS, which premiered at the Beijing International Film Festival, winning Best Director in the Future Forward section. Subsequently, Small Gods received 9 AMAA nominations, with newcomer Chimpaye Florence Mariserena winning Best Lead Actress. It is currently playing further festivals and will be released theatrically by Sovereign Films in 2026.</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Profile;
