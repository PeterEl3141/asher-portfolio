import React from 'react'
import './AwardStripBlack.css'

const logos = [
  { src: 'bbc.png', alt: 'BBC' },
  { src: 'cesar.jpg', alt: 'César' },
  { src: 'forge.png', alt: 'Forge' },
  { src: 'gaumont.png', alt: 'Gaumont' },
];

const publicUrl = (p) => `${import.meta.env.BASE_URL}${p.replace(/^\/+/, '')}`;

export default function AwardStripBlack() {
  return (
    <div className="film-awards-black">
      {logos.map(({ src, alt }) => (
        <img
          key={src}
          src={publicUrl(`/awards/${src}`)}
          alt={alt}
          className="award-black"
          loading="lazy"
        />
      ))}
    </div>
  );
}
