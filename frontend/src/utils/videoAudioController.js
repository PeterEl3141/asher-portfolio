// src/utils/videoAudioController.js

let currentVideo = null;

// per-video fade rAF (NOT global)
const fadeRAFByVideo = new Map();

// prevent “tap spam” races on mobile
let toggleBusy = false;
let lastToggleAt = 0;

export function isCurrentAudible(video) {
  if (!video) return false;
  return currentVideo === video && video.muted === false;
}

function cancelFade(video) {
  const raf = fadeRAFByVideo.get(video);
  if (raf) {
    cancelAnimationFrame(raf);
    fadeRAFByVideo.delete(video);
  }
}

function fade(video, from, to, duration = 200, onDone) {
  if (!video) return;
  cancelFade(video);

  // If the tab is busy / throttled, don’t “accumulate” fades forever
  if (!Number.isFinite(duration) || duration <= 0) {
    video.volume = to;
    onDone?.();
    return;
  }

  const start = performance.now();

  const tick = (now) => {
    const p = Math.min(1, (now - start) / duration);
    video.volume = from + (to - from) * p;

    if (p < 1) {
      const raf = requestAnimationFrame(tick);
      fadeRAFByVideo.set(video, raf);
    } else {
      fadeRAFByVideo.delete(video);
      onDone?.();
    }
  };

  video.volume = from;
  const raf = requestAnimationFrame(tick);
  fadeRAFByVideo.set(video, raf);
}

// iOS-safe pattern:
// - ensure video is playing (muted) inside gesture
// - THEN unmute
async function ensurePlayingMuted(video) {
  if (!video) return false;

  // keep it “play-eligible”
  video.muted = true;
  video.volume = 0;

  // if already playing, great
  if (!video.paused && video.readyState >= 2) return true;

  try {
    const p = video.play();
    if (p && typeof p.then === "function") {
      await p;
    }
    return true;
  } catch {
    return false;
  }
}

export function toggleVideoAudio(video) {
  if (!video) return false;

  const now = performance.now();
  // very small lock to prevent double toggles / ghost taps
  if (toggleBusy && now - lastToggleAt < 250) {
    return isCurrentAudible(video);
  }
  toggleBusy = true;
  lastToggleAt = now;

  // ---- MUTE PATH (make it immediate + deterministic) ----
  if (currentVideo === video && video.muted === false) {
    cancelFade(video);
    // immediate state change
    video.volume = 0;
    video.muted = true;

    currentVideo = null;
    toggleBusy = false;
    return false;
  }

  // ---- switching away: hard-mute previous immediately (avoid delayed callbacks) ----
  if (currentVideo && currentVideo !== video) {
    const prev = currentVideo;
    cancelFade(prev);
    prev.volume = 0;
    prev.muted = true;
  }

  // activate
  currentVideo = video;

  // ---- UNMUTE PATH ----
  // important: DO NOT rely on fades/callbacks to set muted=false
  // get it playing while muted first
  ensurePlayingMuted(video).then((ok) => {
    if (!ok) {
      // couldn’t start playback; stay muted and let next tap retry
      if (currentVideo === video) {
        video.muted = true;
        video.volume = 0;
        currentVideo = null;
      }
      toggleBusy = false;
      return;
    }

    // only unmute if we’re still the active one
    if (currentVideo !== video) {
      toggleBusy = false;
      return;
    }

    // now unmute + fade in (fade is cosmetic)
    video.muted = false;

    // If main thread is overloaded, fade will lag; still set a sane baseline
    video.volume = 1;

    // optional: if you still want fade-in feel, comment out volume=1 above and use fade:
    // video.volume = 0;
    // fade(video, 0, 1, 200);

    toggleBusy = false;
  });

  return true;
}

export function muteIfCurrent(video) {
  if (!video) return;
  if (currentVideo !== video) return;

  cancelFade(video);
  video.volume = 0;
  video.muted = true;
  currentVideo = null;
}
