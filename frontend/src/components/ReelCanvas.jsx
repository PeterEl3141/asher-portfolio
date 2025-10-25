// ReelCanvas.jsx — stable orientation + warm preload + capped playback
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useEffect, useMemo, useRef, useState } from 'react';
import { CLIPS } from '../clips';
import useStore from '../store.js';

/* ---------- tiny in-view hook ---------- */
function useInView(ref, { threshold = 0.15 } = {}) {
  const [inView, set] = useState(true);
  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(([e]) => set(e.isIntersecting), { threshold });
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [ref, threshold]);
  return inView;
}

/* ---------- math helper for camera distance ---------- */
function fitDistanceToRadius({ radius, panelW, panelH, fovyDeg, aspect, margin = 1.18 }) {
  const halfW = radius + panelW * 0.5;
  const halfH = Math.max(panelH * 0.6, 1.0);
  const fovy = THREE.MathUtils.degToRad(fovyDeg);
  const fovx = 2 * Math.atan(Math.tan(fovy / 2) * aspect);
  const dzH = halfH / Math.tan(fovy / 2);
  const dzW = halfW / Math.tan(fovx / 2);
  return Math.max(dzH, dzW) * margin;
}

/* ---------- simple label texture ---------- */
function useLabelTexture(text) {
  return useMemo(() => {
    const c = document.createElement('canvas');
    const ctx = c.getContext('2d');
    c.width = 1024; c.height = 512;
    ctx.fillStyle = '#0d0d0d'; ctx.fillRect(0, 0, c.width, c.height);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 144px system-ui,-apple-system,Segoe UI,Roboto';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text ?? '', c.width / 2, c.height / 2);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, [text]);
}

/* ---------- video texture with warm/preload ---------
   pass { warm: true } to construct <video> + texture early (no play)
   pass { play: true } to actually play (front-most only)
----------------------------------------------------- */
function useVideoTexture(src, { warm = false, play = false } = {}) {
  const [ready, setReady] = useState(false);
  const [texture, setTexture] = useState(null);

  const video = useMemo(() => {
    if (!src || !warm) return null;           // don't even create when not warming
    const v = document.createElement('video');
    v.crossOrigin = 'anonymous';
    v.src = src;
    v.loop = true;
    v.muted = true; v.setAttribute('muted', '');
    v.playsInline = true;
    v.preload = 'metadata';
    v.style.display = 'none';
    document.body.appendChild(v);
    return v;
  }, [src, warm]);

  useEffect(() => {
    if (!video) { setReady(false); setTexture(null); return; }
    let alive = true;
    let tex = null;

    const onReady = async () => {
      if (!alive) return;
      // build texture as soon as we have a frame
      tex = new THREE.VideoTexture(video);
      tex.flipY = false;                             // keep upright
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.generateMipmaps = false;
      setTexture(tex);
      setReady(true);
      if (play) { try { await video.play(); } catch {} }
    };

    const onError = () => { if (alive) setReady(false); };

    video.addEventListener('loadeddata', onReady, { once: true });
    video.addEventListener('canplay', onReady, { once: true });
    video.addEventListener('error', onError);
    try { video.load(); } catch {}

    return () => {
      alive = false;
      video.removeEventListener('loadeddata', onReady);
      video.removeEventListener('canplay', onReady);
      video.removeEventListener('error', onError);
      try { video.pause(); } catch {}
      if (tex) tex.dispose();
      if (video.parentNode) video.parentNode.removeChild(video);
    };
  }, [video, play]);

  // react to play-toggle after warm
  useEffect(() => {
    if (!video) return;
    if (play) { video.play().catch(() => {}); }
    else { try { video.pause(); } catch {} }
  }, [video, play]);

  return { texture, ready, video };
}

/* ---------- Panel ---------- */
function ClipPanel({
  clip, angle, radius, panelW, panelH, facing = 'outward',
  warm = false, active = false,
}) {
  const setSelected = useStore((s) => s.setSelected);
  const setHoverActive = useStore((s) => s.setHoverActive);
  const { gl } = useThree();
  const group = useRef();
  const [hovered, setHovered] = useState(false);
  const labelTexture = useLabelTexture(clip.title);

  // deterministic placement & yaw (no roll/pitch)
  useEffect(() => {
    if (!group.current) return;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const yaw = Math.atan2(z, x) + (facing === 'outward' ? 0 : Math.PI);
    group.current.position.set(x, 0, z);
    group.current.rotation.set(0, yaw, 0);
  }, [angle, radius, facing]);

  // cursor
  useEffect(() => {
    if (!gl?.domElement) return;
    gl.domElement.style.cursor = hovered ? 'pointer' : 'auto';
    return () => { gl.domElement.style.cursor = 'auto'; };
  }, [gl, hovered]);

  // warm the video early; only play if active
  const { texture: vidTex, ready } = useVideoTexture(clip.src, { warm, play: active });

  return (
    <group
      ref={group}
      onPointerOver={() => { setHoverActive(true); setHovered(true); }}
      onPointerOut={() => { setHoverActive(false); setHovered(false); }}
      onClick={() => setSelected(clip)}
    >
      <mesh scale={[hovered ? 1.04 : 1, hovered ? 1.04 : 1, 1]}>
        <planeGeometry args={[panelW, panelH]} />
        <meshBasicMaterial
          map={ready && vidTex ? vidTex : labelTexture}
          toneMapped={false}
          side={THREE.FrontSide}
        />
      </mesh>
    </group>
  );
}

/* ---------- Ring: drag + inertia + budgeted activation ---------- */
function Ring({
  clips, ringRadius, panelW, panelH, facing, inView,
  maxActive = 2, warmExtra = 4, yOffset = 0,
}) {
  const group = useRef();
  const { gl } = useThree();

  // drag/inertia
  const dragging = useRef(false);
  const lastX = useRef(0);
  const vel = useRef(0);
  const dragFactor = 0.005;
  const friction = 0.94;

  useEffect(() => {
    const el = gl.domElement;
    const down = (e) => { dragging.current = true; lastX.current = e.clientX ?? e.touches?.[0]?.clientX ?? 0; };
    const move = (e) => {
      if (!dragging.current || !group.current) return;
      const x = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
      const dx = x - lastX.current; lastX.current = x;
      const delta = dx * dragFactor;
      group.current.rotation.y += delta; vel.current = delta;
    };
    const up = () => { dragging.current = false; };

    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    el.addEventListener('touchstart', down, { passive: true });
    el.addEventListener('touchmove', move, { passive: true });
    window.addEventListener('touchend', up);

    return () => {
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      el.removeEventListener('touchstart', down);
      el.removeEventListener('touchmove', move);
      window.removeEventListener('touchend', up);
    };
  }, [gl]);

  // auto-spin & compute active/warm sets
  const [activeSet, setActiveSet] = useState(new Set());
  const [warmSet, setWarmSet] = useState(new Set());
  const baseSpeed = 0.06;
  const accum = useRef(0);

  useFrame((_, dt) => {
    if (!group.current) return;

    // spin + inertia (skip when scrolled offscreen)
    if (inView) group.current.rotation.y += baseSpeed * dt;
    if (!dragging.current) {
      group.current.rotation.y += vel.current;
      vel.current *= friction;
      if (Math.abs(vel.current) < 1e-5) vel.current = 0;
    }

    // refresh budgets ~5x/sec
    accum.current += dt;
    if (accum.current < 0.2) return;
    accum.current = 0;

    const N = clips.length;
    const theta = group.current.rotation.y;
    const scored = Array.from({ length: N }, (_, i) => {
      const phi = (i / N) * Math.PI * 2;
      // bigger z' -> closer to camera at +z
      const zPrime = Math.sin(phi + theta) * ringRadius;
      return [i, zPrime];
    }).sort((a, b) => b[1] - a[1]);

    const nextActive = new Set(scored.slice(0, Math.min(maxActive, N)).map(([i]) => i));
    const nextWarm = new Set(scored.slice(0, Math.min(maxActive + warmExtra, N)).map(([i]) => i));

    // only set state if changed (avoid re-render churn)
    let changedA = nextActive.size !== activeSet.size || [...nextActive].some(i => !activeSet.has(i));
    let changedW = nextWarm.size !== warmSet.size || [...nextWarm].some(i => !warmSet.has(i));
    if (changedA) setActiveSet(nextActive);
    if (changedW) setWarmSet(nextWarm);
  });

  return (
    <group ref={group} position={[0, yOffset, 0]}>
      {clips.map((c, i) => (
        <ClipPanel
          key={c.id}
          clip={c}
          angle={(i / clips.length) * Math.PI * 2}
          radius={ringRadius}
          panelW={panelW}
          panelH={panelH}
          facing={facing}
          warm={inView && warmSet.has(i)}
          active={inView && activeSet.has(i)}
        />
      ))}
    </group>
  );
}

/* ---------- Camera rig: hover dolly + pinch/ctrl-wheel zoom ---------- */
function Rig({ baseDist = 10, inView = true }) {
  const { camera, gl } = useThree();
  const hoverActive = useStore((s) => s.hoverActive);

  const minZ = baseDist * 0.7;
  const maxZ = baseDist * 1.8;
  const target = useRef(new THREE.Vector3(0, 0, 0));

  useFrame((_, dt) => {
    if (!inView) return;
    const baseZ = baseDist;
    const hoverZ = baseDist * 0.85;
    const desiredZ = hoverActive ? hoverZ : baseZ;
    camera.position.z = THREE.MathUtils.clamp(
      THREE.MathUtils.damp(camera.position.z, desiredZ, 3, dt),
      minZ, maxZ
    );
    camera.position.y = THREE.MathUtils.damp(camera.position.y, 1.2, 3, dt);
    camera.lookAt(target.current);
  });

  useEffect(() => {
    const el = gl.domElement;
    const onWheel = (e) => {
      if (!e.ctrlKey) return; // only pinch-zoom
      e.preventDefault();
      const dz = (e.deltaY / 100) * (camera.position.z * 0.08);
      camera.position.z = THREE.MathUtils.clamp(camera.position.z + dz, minZ, maxZ);
    };
    let pinchStart = 0, startZ = camera.position.z;
    const d = (t) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
    const onTS = (e) => { if (e.touches.length === 2) { pinchStart = d(e.touches); startZ = camera.position.z; } };
    const onTM = (e) => {
      if (e.touches.length !== 2) return;
      e.preventDefault();
      const scale = pinchStart / d(e.touches);
      camera.position.z = THREE.MathUtils.clamp(startZ * scale, minZ, maxZ);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('touchstart', onTS, { passive: true });
    el.addEventListener('touchmove', onTM, { passive: false });
    return () => {
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('touchstart', onTS);
      el.removeEventListener('touchmove', onTM);
    };
  }, [camera, gl, minZ, maxZ]);

  return null;
}

/* ---------- Top-level ---------- */
export default function ReelCanvas() {
  // Size knobs
  const PANEL_W = 4.6;
  const PANEL_H = PANEL_W * 9 / 16;
  const FOV = 50;
  const RING_Y = 0.6;

  // ring radius based on number of clips + small gutter
  const N = CLIPS.length || 1;
  const GUTTER = 0.2;
  const RING_RADIUS = Math.max((N * PANEL_W * (1 + GUTTER)) / (2 * Math.PI), PANEL_W * 0.9);

  const wrapRef = useRef(null);
  const inView = useInView(wrapRef, { threshold: 0.2 });

  return (
    <div ref={wrapRef} className="relative w-full h-screen md:h-[110vh] -mt-6 md:-mt-10 mb-16 md:mb-24">
      <Canvas
        gl={{ alpha: true, antialias: false, powerPreference: 'high-performance' }}
        dpr={[1, 1.5]}                             // cap DPR to reduce GPU work
        camera={{ fov: FOV, position: [0, 1.2, 12] }}
        className="absolute inset-0"
      >
        <Scene
          ringRadius={RING_RADIUS}
          panelW={PANEL_W}
          panelH={PANEL_H}
          fov={FOV}
          ringY={RING_Y}
          inView={inView}
        />
      </Canvas>
    </div>
  );
}

function Scene({ ringRadius, panelW, panelH, fov, ringY = 0, inView }) {
  const { camera, size } = useThree();
  const [baseDist, setBaseDist] = useState(10);

  useEffect(() => {
    const dist = fitDistanceToRadius({
      radius: ringRadius, panelW, panelH,
      fovyDeg: fov, aspect: size.width / size.height,
    });
    setBaseDist(dist);
    camera.position.set(0, 1.2, dist);
    camera.lookAt(0, 0, 0);
  }, [camera, size, ringRadius, panelW, panelH, fov]);

  return (
    <>
      <fog attach="fog" args={[0x0b0b0b, 8, 20]} />
      <ambientLight intensity={0.6} />
      <Ring
        clips={CLIPS}
        facing="outward"
        ringRadius={ringRadius}
        panelW={panelW}
        panelH={panelH}
        yOffset={ringY}
        inView={inView}
        maxActive={2}          // play only the two most-front panels
        warmExtra={4}          // but keep 4 more preloaded
      />
      <Rig baseDist={baseDist} inView={inView} />
    </>
  );
}
