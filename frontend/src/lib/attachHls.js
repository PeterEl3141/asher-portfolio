// Simple helper to wire an HTMLVideoElement to an HLS manifest.
// Works in Safari (native HLS) and other browsers via hls.js.
// Returns a cleanup function.
import Hls from "hls.js";

export function attachHls(videoEl, src, { onReady } = {}) {
  const ready = () => onReady && onReady();

  if (videoEl.canPlayType("application/vnd.apple.mpegURL")) {
    videoEl.src = src;
    videoEl.addEventListener("canplay", ready, { once: true });
    return () => videoEl.removeEventListener("canplay", ready);
  }

  if (Hls.isSupported()) {
    const hls = new Hls();
    hls.loadSource(src);
    hls.attachMedia(videoEl);
    hls.on(Hls.Events.MANIFEST_PARSED, ready);
    return () => hls.destroy();
  }

  // Fallback (very old browsers)
  videoEl.src = src;
  videoEl.addEventListener("canplay", ready, { once: true });
  return () => videoEl.removeEventListener("canplay", ready);
}
