import React from "react";
import "./AwardStripWhite.css";
import FinDivider from "./FinDivider.jsx";
import finWhite from "/images/Fin-white.png";

const logos = [
  { src: "benveniste.png", alt: "benveniste" },
  { src: "county.png",     alt: "county" },
  { src: "rotor.png",      alt: "rotor" },
  { src: "ect.png",        alt: "ect" },
];

const publicUrl = (p) => `${import.meta.env.BASE_URL}${p.replace(/^\/+/, "")}`;

export default function AwardStripWhite() {
  const finH = 80;

  return (
    <section className="film-awards-white">
        
       

      <div className="film-awards-white__logos">
        {logos.map(({ src, alt }) => (
          <img
            key={src}
            src={publicUrl(`/awards/${src}`)}  // files in /public/awards/
            alt={alt}
            className="award-white"
            loading="lazy"
          />
        ))}
      </div>
    </section>
  );
}




/* <FinDivider
src={finWhite}
tileWidth={180}
overlap={90}
tileHeight={finH}
mount="lower"
offset={0}
scrollLinked    // <- enable
speedX={0.35}   // horizontal rate (px per px scroll)
// vertical rate (negative = drift upward when scrolling down)
/>

*/