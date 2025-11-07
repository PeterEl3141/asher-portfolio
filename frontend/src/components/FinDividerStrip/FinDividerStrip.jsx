import FinDivider from "../FinDivider.jsx";
import finWhite from "/images/Fin-white.png";
import './FinDividerStrip.css'
export default function FinDividerStrip({ height = 80 }) {
  return (
    <div className="fin-strip">
      <FinDivider
        src={finWhite}
        tileWidth={180}
        overlap={90}
        tileHeight={height}
        mount="lower"
        offset={0}
        scrollLinked
        speedX={0.35}
      />
    </div>
  );
}
