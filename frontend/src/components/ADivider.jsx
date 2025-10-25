// src/components/ADivider.jsx
import React from "react";
import "./ADivider.css";

const publicUrl = (p) => `${import.meta.env.BASE_URL}${p.replace(/^\/+/, "")}`;

export default function ADivider({
  src = "/images/A.png",   // file in frontend/public/images/A.png
  height = "96px",         // change to suit (e.g., "120px")
  className = "",
}) {

    
  return (
    <div
      className={`a-divider ${className}`}
      style={{
        "--a-img": `url(${publicUrl(src)})`,
        "--a-h": height,
      }}
      aria-hidden="true"
      role="presentation"
    />
  );
}
