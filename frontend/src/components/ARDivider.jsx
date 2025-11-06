import React from "react";
import "./ARDivider.css";

const publicUrl = (p) => `${import.meta.env.BASE_URL}${p.replace(/^\/+/, "")}`;

export default function ARDivider({
  aSrc = "/images/A.png",
  rSrc = "/images/R.png",
  height = "5px",
  speedA = "20s",
  speedR = "20s",
  className = "",
  // NEW:
  style = {},
  dashOffset,   // e.g. "-24px" (moves artwork up)
  seamNudge,    // e.g. "-24px" (moves seam up)
}) {
  const mergedStyle = {
    "--ar-h": height,
    "--a-img": `url(${publicUrl(aSrc)})`,
    "--r-img": `url(${publicUrl(rSrc)})`,
    "--speed-a": speedA,
    "--speed-r": speedR,
    // allow explicit props…
    ...(dashOffset != null ? { "--dash-offset": dashOffset } : {}),
    ...(seamNudge  != null ? { "--seam-nudge":  seamNudge }  : {}),
    // …and allow callers to override anything
    ...style,
  };

  return (
    <div
      className={`ar-divider ${className}`}
      style={mergedStyle}
      aria-hidden="true"
      role="presentation"
    />
  );
}
