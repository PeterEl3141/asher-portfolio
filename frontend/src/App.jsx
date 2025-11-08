import HeroVideo from './components/HeroVideo';
import ReelCanvas from './components/ReelCanvas';
import SiteFooter from './components/SiteFooter';
import Profile from './components/Profile.jsx';
import PosterClip1 from './components/PosterClip1.jsx';
import PosterClip2 from './components/PosterClip2.jsx';
import AwardStripBlack from './components/AwardStripBlack.jsx';
import AwardStripWhite from './components/AwardStripWhite.jsx';
import ADivider from './components/ADivider.jsx';
import ARDivider from './components/ARDivider.jsx';
import Press from './components/Press.jsx';
import FinDivider from "./components/FinDivider";
import Upcoming from './components/Upcoming.jsx';
import HeroDivider from './components/HeroDivider.jsx';
import FinParallaxDivider from './components/FinParallaxDivider.jsx';
import FinNewDivider from './components/FinNewDivider.jsx';
import PosterClip from './components/PosterClip.jsx';
import VideoPlayer from "./components/VideoPlayer/VideoPlayer";
import VideoP from "./components/VideoP/VideoP.jsx";
import FinDividerStrip from './components/FinDividerStrip/FinDividerStrip.jsx';
import { useState, useEffect } from 'react';


// ---- tiny hook: true on desktop, false on tablet & below ----
function useIsDesktop(minWidth = 1024) {
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === "undefined") return true; // SSR-safe default
    return window.matchMedia(`(min-width: ${minWidth}px)`).matches;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia(`(min-width: ${minWidth}px)`);
    const onChange = e => setIsDesktop(e.matches);
    // modern addEventListener; falls back if needed
    mql.addEventListener ? mql.addEventListener("change", onChange)
                         : mql.addListener(onChange);
    // sync once in case of hydration mismatch
    setIsDesktop(mql.matches);
    return () => {
      mql.removeEventListener ? mql.removeEventListener("change", onChange)
                              : mql.removeListener(onChange);
    };
  }, [minWidth]);

  return isDesktop;
}






export default function App() {
  // Desktop = width >= 1024px (iPad landscape and smaller are excluded)
  const isDesktop = useIsDesktop(1024);

  const reels = [
    { id: "7d9cd1be2d5561193b5812f929fc3521", poster: "/posters/MukonSkate.png",       title: "MukonSkateProm_0" },
    { id: "bd0df89c371e23a5414e7727481a07e1", poster: "/posters/Rev.png",               title: "Rev" },
    { id: "4a84b0febdf33fb8405c97aed67ab4d9", poster: "/posters/Facebook.png",         title: "facebook" },
    { id: "4a50ed24399ad7162a546ba7f46b0f60", poster: "/posters/SkateVid.png",         title: "SkateVid" },
    { id: "429198b947cc4dcec1dd60d50dbaca14", poster: "/posters/Sublimation.png",      title: "sublimationMusicVideo" },
    { id: "356da0bef6e3780b6aac5799ee9c78af", poster: "/posters/TakeNote.png",         title: "takeNoteMusicVideo" },
    { id: "978d647765c28ddd2a9f62a4379411b2", poster: "/posters/Downsizing.png",       title: "downsizing" },
    { id: "40212dc32fdd693428973dd61dbb7d9f", poster: "/posters/Discovery.png",        title: "discovery" }
  ];

  return (
    <main className="bg-[var(--bg)] text-[var(--fg)]">
      <HeroVideo />
      
      {isDesktop && (
        <FinParallaxDivider
          height={700}
          scrollDistance={1600}
          lockAt={1}
          yStartPercent={300}
          fins={[
            { w: 130, left: -70, z: 3, dur: 1 },
            { w: 120, left: -50, z: 2, dur: 1.1 },
            { w: 150, left: -32, z: 4, dur: 1.3 },
            { w: 130, left: -2,  z: 3, dur: 1.1 },
            { w: 150, left: 22,  z: 1, dur: 1.0 },
            { w: 180, left: 35,  z: 5, dur: 1.1 },
          ]}
        />
      )}
      
      <Profile />

      <PosterClip
      posterSrc="/images/Nyama-Poster.png"
      videoId="2dba4932447ad0a3dafe3d94808f1939"
      />

<PosterClip
  posterSrc="/images/Rabbi-Son-Poster.png"
  videoId="00ed22a6dd2dd3c9e0d87fe0b67c3c5a"
/>

<AwardStripBlack/>

<FinDividerStrip height={80} />

<VideoP videos={reels} initialIndex={1} />


<AwardStripWhite/>

<Press/>

<Upcoming/>
<ARDivider
  height="70px"
  className="ar-divider--seam ar-divider--band ar-divider--blend"
  dashOffset="0px"   // move artwork up ~24px
  seamNudge="-30px"    // move the seam up ~24px
/>
<SiteFooter />
      
      
    </main>
  );
}



/*

<VideoPlayer videos={reels} initialIndex={0} stretchDuration={1200} />


<ARDivider
        height="150px"
        className="ar-divider--seam ar-divider--band ar-divider--blend"
        dashOffset="12px"   // move artwork up ~24px
        seamNudge="-24px"    // move the seam up ~24px
      />
            <ADivider height='150px' className="a-divider--marquee"/>

      <section className="relative">
        <ReelCanvas />
      </section>
      
      
      <FinDivider
      src="/images/Fin-black.png"
      tileWidth={150}   // pick the width your exported PNG looks crisp at
      overlap={73}      // tune this until the seam is perfect
      tileHeight={100}  // optional: fix height; otherwise natural aspect
      mount="lower"            // <-- key line
      offset={0} 
    />
    
    
    <HeroDivider
        overlap={100}        // px each fin overlaps the previous one
        speed={80}          // px/sec horizontal drift
        startingPoint={0}   // px offset from when divider hits bottom of viewport
        //bleed={10}         // px the fins rise before releasing the scroll
        height={200}        // visual height of the fin strip (matches your design)
      />




      <FinParallaxDivider
  height={220}
  xOverlap={14}   // ← small horizontal overlap between adjacent fins
  fins={[
    // size is a relative weight for column width. Bigger size → wider column.
    // If you omit size, we'll use scale as the weight automatically.
    { src: "/images/Fin-hero.png", size: 0.8, scale: 0.9, start: 0.00, end: 1.00 },
    { src: "/images/Fin-hero.png", size: 2.5, scale: 1.6, start: 0.05, end: 0.70 }, // big boy (≈2–3× width)
    { src: "/images/Fin-hero.png", size: 0.7, scale: 0.8, start: 0.12, end: 0.95 },
    { src: "/images/Fin-hero.png", size: 1.8, scale: 1.3, start: 0.18, end: 0.85 },
    { src: "/images/Fin-hero.png", size: 0.9, scale: 1.0, start: 0.25, end: 0.90 },
    { src: "/images/Fin-hero.png", size: 1.3, scale: 1.1, start: 0.12, end: 0.75 },
  ]}
/>


 <section className="relative isolate mt-16 mb-12">
        <PosterClip1 posterSrc='/images/Nyama-Poster.png' videoSrc='/clips/NyamaSizzle.mp4'/>
      </section>
      
      
      <section className="relative isolate mt-16 mb-24 pt-32 md:pt-48">
        <PosterClip1 posterSrc='/images/Rabbi-Son-Poster.png' videoSrc='/clips/RabbisSon.mp4' align='right'/>
      </section>



          { src: "/clips/failures.mp4",          poster: "/posters/Failures.png", title: "failures" },

    */