import React, { useEffect, useRef, useState } from "react";
import "./Press.css";
import FinDivider from "./FinDivider";
import finBlack from "/images/Fin-black.png";

const PRESS_ITEMS = [
  { src: "/press/filmlondon.jpg", title: "Screen Daily",
    excerpt:
      "Picturehouse is a terrific venue. It is quiet, it is contained. Just to have a chance to sit down and have a conversation with folks I didn’t have a chance to meet with in Cannes is very helpful.",
    url: "https://www.screendaily.com/features/international-buyers-head-to-london-screenings-in-search-of-one-to-one-meetings-about-uk-films/5206311.article",
  },
  { src: "/press/screendaily2.png", title: "Screen Daily",
    excerpt: "Feature film focuses on the landless Batwa people of Africaʼs Great Lakes Region.",
    url: "https://www.screendaily.com/news/sovereign-scala-start-production-on-africa-set-film-small-gods/5175291.article",
  },
  { src: "/press/cesar.jpg", title: "Cesar",
    excerpt:
      "Animation, documentary or fiction, the short films of Nuits en Or take you in just a few minutes from a funny or crazy universe to a dive into a breathtaking, committed or moving story.",
    url: "https://www.academie-cinema.org/evenements/les-nuits-en-or-2022/",
  },
  { src: "/press/rotor.png", title: "Rotor",
    excerpt:
      "Earlier this year we began working on a brand new concept to bring you a super high-end collection of footage. Working again with young director Asher Rosen—the creator of our Skate and Waterblade collections we developed 'The Fit'",
    url: "https://rotorvideos.com/blog/new-rotor-collection-features-in-latest-just-charlii-video",
  },
  { src: "/press/afrocritik.png", title: "Afrocritik",
    excerpt:
      "[...] and Uganda’s Small Gods, the feature debuts of Imran Hamdulay and Asher Rosen respectively, which earned spots in the Best Film, Best Director, and the Ousmane Sembene Award for Best Film in an African Language categories, as well as Best Debut Feature.'",
    url: "https://afrocritik.com/2025-amaa-nominations-full-list/",
  },
];

/* ---------- Pixelated thumbnail overlay (canvas) ----------

   - Draws the image at very low resolution, then upscales with
     ctx.imageSmoothingEnabled = false → big square pixels.
   - Animates "block size" from 30 → 1 on activate (unfurl),
     and 1 → 30 on deactivate (refurl).

---------------------------------------------------------------- */
function PixelThumb({ src, title, isActive, onActivate }) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const imgRef = useRef(null);
  const animRef = useRef(null);
  const fromRef = useRef(30);
  const toRef = useRef(isActive ? 1 : 30);

  // load image once
  useEffect(() => {
    const img = new Image();
    img.src = src;
    img.crossOrigin = "anonymous";
    img.decode?.().then(() => {
      imgRef.current = img;
      draw( isActive ? 1 : 30 );
    }).catch(() => {
      // fallback draw when decode not supported
      img.onload = () => { imgRef.current = img; draw(isActive ? 1 : 30); };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  // resize observer so the canvas always fills the thumb
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const ro = new ResizeObserver(() => draw(isActive ? 1 : 30));
    ro.observe(wrap);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  // animate when active state flips
  useEffect(() => {
    animateTo(isActive ? 1 : 30, 240); // 240ms unfurl/refurl
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  function animateTo(target, durationMs) {
    cancelAnimationFrame(animRef.current);
    const start = performance.now();
    const startVal = fromRef.current;
    const delta = target - startVal;
    toRef.current = target;

    const tick = (t) => {
      const p = Math.min(1, (t - start) / durationMs);
      // ease-out
      const e = 1 - Math.pow(1 - p, 3);
      const current = startVal + delta * e;
      draw(current);
      if (p < 1) {
        animRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = target;
      }
    };
    animRef.current = requestAnimationFrame(tick);
  }

  function draw(blockSize) {
    const img = imgRef.current;
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!img || !canvas || !wrap) return;

    // canvas CSS size
    const W = Math.max(1, Math.floor(wrap.clientWidth));
    const H = Math.max(1, Math.floor(wrap.clientHeight));
    if (canvas.width !== W) canvas.width = W;
    if (canvas.height !== H) canvas.height = H;

    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;

    // cover-fit crop from source
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;
    const cRatio = W / H;
    const iRatio = iw / ih;

    let sx, sy, sw, sh;
    if (iRatio > cRatio) {
      // image is wider → crop left/right
      sh = ih;
      sw = ih * cRatio;
      sx = (iw - sw) / 2;
      sy = 0;
    } else {
      // image is taller → crop top/bottom
      sw = iw;
      sh = iw / cRatio;
      sx = 0;
      sy = (ih - sh) / 2;
    }

    // draw onto a tiny offscreen canvas (W / blockSize)
    const bs = Math.max(1, blockSize | 0);
    const ow = Math.max(1, Math.round(W / bs));
    const oh = Math.max(1, Math.round(H / bs));
    const off = document.createElement("canvas");
    off.width = ow;
    off.height = oh;
    const octx = off.getContext("2d");
    octx.imageSmoothingEnabled = false;
    octx.drawImage(img, sx, sy, sw, sh, 0, 0, ow, oh);

    // now scale the tiny image back up → chunky pixels
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(off, 0, 0, ow, oh, 0, 0, W, H);
  }

  return (
    <button
      className={`press-thumb ${isActive ? "is-active" : "is-inactive"}`}
      onMouseEnter={onActivate}
      onFocus={onActivate}
      onClick={onActivate}
      aria-label={`Show article from ${title}`}
    >
      {/* crisp base */}
      <img className="thumb-base" src={src} alt={title} />

      {/* pixel overlay */}
      <span className="thumb-canvas-wrap" ref={wrapRef} aria-hidden="true">
        <canvas className="thumb-pixel-canvas" ref={canvasRef} />
      </span>
    </button>
  );
}

export default function Press() {
  const [active, setActive] = useState(0);
  const [pressY, setPressY] = useState(0);
  const sectionRef = useRef(null);

  // Parallax for "PRESS"
  useEffect(() => {
    const handleScroll = () => {
      if (!sectionRef.current) return;
      const rect = sectionRef.current.getBoundingClientRect();
      const visible = rect.top < window.innerHeight && rect.bottom > 0;
      if (!visible) return;
      const factor = 0.35;
      const delta = -rect.top;
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
  const finH = 80;

  return (
    <section className="press-section" ref={sectionRef}>
      <div className="fin-overlay" aria-hidden="true">
        <FinDivider
          src={finBlack}
          tileWidth={180}
          overlap={90}
          tileHeight={finH}
          mount="lower"
          offset={0}
          scrollLinked
          speedX={0.35}
        />
      </div>

      <div
        className="press-hero-word"
        aria-hidden
        style={{ transform: `translate3d(0, ${pressY}px, 0)` }}
      >
        PRESS
      </div>

      <div className="press-content">
        <div className="press-main">
          <a
            href={current.url}
            target="_blank"
            rel="noreferrer"
            className="press-main-link"
            aria-label={`Read full article on ${current.title}`}
          >
            <img src={current.src} alt={current.title} className="press-main-img" />
            <div className="press-main-overlay">[read full article]</div>
          </a>
        </div>

        {/* key={active} → re-run the unfurl every time selection changes */}
        <aside className="press-meta reveal-slice" key={active}>
          <h3 className="press-title">{current.title}</h3>
          <p className="press-excerpt">{current.excerpt}</p>
        </aside>
      </div>

      <div className="press-thumbs">
        {PRESS_ITEMS.map((item, i) => (
          <PixelThumb
            key={item.src}
            src={item.src}
            title={item.title}
            isActive={i === active}
            onActivate={() => setActive(i)}
          />
        ))}
      </div>
    </section>
  );
}
