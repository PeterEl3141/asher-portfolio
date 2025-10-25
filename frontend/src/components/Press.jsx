import React, { useEffect, useRef, useState } from "react";
import "./Press.css";


// Update these with your real press data
const PRESS_ITEMS = [
  {
    src: "/press/screendaily1.png",
    title: "Screen Daily",
    excerpt:
    "Picturehouse is a terrific venue. It is quiet, it is contained. Just to have a chance to sit down and have a conversation with folks I didn’t have a chance to meet with in Cannes is very helpful.",
    url: "https://www.screendaily.com/features/international-buyers-head-to-london-screenings-in-search-of-one-to-one-meetings-about-uk-films/5206311.article",
  },
  {
    src: "/press/screendaily2.png",
    title: "Screen Daily",
    excerpt:
      "Feature film focuses on the landless Batwa people of Africaʼs Great Lakes Region.",
    url: "https://www.screendaily.com/news/sovereign-scala-start-production-on-africa-set-film-small-gods/5175291.article",
  },
  {
    src: "/press/cesar.png",
    title: "Cesar",
    excerpt:
      "Animation, documentary or fiction, the short films of Nuits en Or take you in just a few minutes from a funny or crazy universe to a dive into a breathtaking, committed or moving story.",
    url: "https://www.academie-cinema.org/evenements/les-nuits-en-or-2022/",
  },
  {
    src: "/press/rotor.png",
    title: "Rotor",
    excerpt:
    "Earlier this year we began working on a brand new concept to bring you a super high-end collection of footage. Working again with young director Asher Rosen—the creator of our Skate and Waterblade collections we developed 'The Fit'",
    url: "https://rotorvideos.com/blog/new-rotor-collection-features-in-latest-just-charlii-video",
  },
  
];

export default function Press() {
  const [active, setActive] = useState(0);
  const [pressY, setPressY] = useState(0);
  const sectionRef = useRef(null);

  // Parallax for massive "PRESS" word
  useEffect(() => {
    const handleScroll = () => {
      if (!sectionRef.current) return;
      const rect = sectionRef.current.getBoundingClientRect();
      const visible = rect.top < window.innerHeight && rect.bottom > 0;
      if (!visible) return;

      const factor = 0.35; // moves slower than page scroll
      const delta = -rect.top; // positive as you scroll down
      setPressY(delta * factor);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, []);

  const current = PRESS_ITEMS[active];

  return (
    <section className="press-section" ref={sectionRef}>
      {/* Massive background word with parallax */}
      <div
        className="press-hero-word"
        aria-hidden
        style={{ transform: `translate3d(0, ${pressY}px, 0)` }}
      >
        PRESS
      </div>

      <div className="press-content">
        {/* Big central div */}
        <div className="press-main">
          <a
            href={current.url}
            target="_blank"
            rel="noreferrer"
            className="press-main-link"
            aria-label={`Read full article on ${current.title}`}
          >
            <img
              src={current.src}
              alt={current.title}
              className="press-main-img"
            />
            <div className="press-main-overlay">[read full article]</div>
          </a>
        </div>

        {/* Title (top-right) and excerpt (lower-right) */}
        <aside className="press-meta">
          <h3 className="press-title">{current.title}</h3>
          <p className="press-excerpt">{current.excerpt}</p>
        </aside>
      </div>

      {/* 6 smaller images underneath */}
      <div className="press-thumbs">
        {PRESS_ITEMS.map((item, i) => (
          <button
            key={item.src}
            className={`press-thumb ${i === active ? "is-active" : "is-inactive"}`}
            onClick={() => setActive(i)}
            aria-label={`Show article from ${item.title}`}
          >
            <img src={item.src} alt={item.title} />
          </button>
        ))}
      </div>
    </section>
  );
}
