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
    cancelFade();
    // hard mute immediately (more reliable than waiting for fade callback)
    video.volume = 0;
    video.muted = true;

    // optional: keep your fade-out feel
    fade(video, 0, 0, 0, () => {});

    currentVideo = null;
    return false;
  }

  // Switching from another video → fade previous out + mute
  if (currentVideo && currentVideo !== video) {
    const prev = currentVideo;
    cancelFade();
    fade(prev, prev.volume ?? 1, 0, 150, () => {
      prev.volume = 0;
      prev.muted = true;
    });
  }

  currentVideo = video;

  // ✅ iOS-safe unlock pattern:
  // 1) ensure "muted play" is happening in the gesture
  // 2) only unmute after play() actually starts
  try {
    video.muted = true;
    video.volume = 0;

    const p = video.play();
    if (p && typeof p.then === "function") {
      p.then(() => {
        // now it's truly playing -> unmute is much more reliable
        video.muted = false;
        fade(video, 0, 1, 250);
      }).catch(() => {
        // play failed: leave muted and let the next tap retry
        video.muted = true;
        video.volume = 0;
      });
    } else {
      // older browsers: best effort
      video.muted = false;
      fade(video, 0, 1, 250);
    }
  } catch {
    video.muted = true;
    video.volume = 0;
    return false;
  }

  // Return "intended audible" (UI will flip immediately; actual audible follows play resolve)
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
