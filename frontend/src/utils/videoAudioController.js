// src/utils/videoAudioController.js

let currentVideo = null;
let fadeRAF = null;

export function isCurrentAudible(video) {
  if (!video) return false;
  return currentVideo === video && !video.muted;
}

function cancelFade() {
  if (fadeRAF) {
    cancelAnimationFrame(fadeRAF);
    fadeRAF = null;
  }
}

function fade(video, from, to, duration = 250, onDone) {
  cancelFade();
  const start = performance.now();

  function tick(now) {
    const p = Math.min(1, (now - start) / duration);
    video.volume = from + (to - from) * p;
    if (p < 1) {
      fadeRAF = requestAnimationFrame(tick);
    } else {
      fadeRAF = null;
      onDone?.();
    }
  }

  video.volume = from;
  fadeRAF = requestAnimationFrame(tick);
}

export function toggleVideoAudio(video) {
  if (!video) return false;

  // Clicking the currently active video → mute it
  if (currentVideo === video) {
    fade(video, video.volume ?? 1, 0, 200, () => {
      video.muted = true;
    });
    currentVideo = null;
    return false;
  }

  // Fade out previous video (if any)
  if (currentVideo && currentVideo !== video) {
    const prev = currentVideo;
    fade(prev, prev.volume ?? 1, 0, 200, () => {
      prev.muted = true;
    });
  }

  // Activate new one
  currentVideo = video;

  // ✅ CRITICAL ORDER FOR iOS
  video.muted = false;   // ← MUST come first
  video.volume = 0;

  try {
    const p = video.play(); // ← must happen AFTER unmute
    if (p && typeof p.catch === "function") p.catch(() => {});
  } catch {}

  fade(video, 0, 1, 250);

  return true;
}



export function muteIfCurrent(video) {
  if (currentVideo === video) {
    fade(video, video.volume ?? 1, 0, 200, () => {
      video.muted = true;
    });
    currentVideo = null;
  }
}
