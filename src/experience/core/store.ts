/**
 * A tiny mutable store shared by the DOM interface and the 3D world.
 *
 * Deliberately not React state: scroll and pointer change every frame and the
 * renderer reads them inside useFrame, so routing them through React would
 * re-render the tree 60 times a second for nothing.
 */

type Listener = () => void;

export interface FrameReadout {
  /** pointer position on the ground plane, world units */
  x: number;
  z: number;
  /** ring number under the pointer (growth field isoline index) */
  ring: number;
  /** pith projected to the screen, CSS pixels; null if off-screen */
  pith: { x: number; y: number } | null;
}

const listeners = new Set<Listener>();
const frameListeners = new Set<(r: FrameReadout) => void>();

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function storedMotion(): boolean | null {
  try {
    const v = localStorage.getItem('archive:motion');
    return v === null ? null : v === 'on';
  } catch {
    return null;
  }
}

export const store = {
  /** continuous scroll coordinate across acts, 0..4 (written by the interface) */
  act: 0,
  /** pointer in normalized device coordinates */
  pointer: { x: 0, y: 0, lastMove: -Infinity, inside: false },
  /** false when the visitor or the OS asks for reduced motion */
  motion: true,
  /** true after the first frame has been drawn */
  ready: false,
  /** 'pending' | 'webgl' | 'fallback' */
  renderer: 'pending' as 'pending' | 'webgl' | 'fallback',
};

if (typeof window !== 'undefined') {
  store.motion = storedMotion() ?? !prefersReducedMotion();
}

export function subscribe(fn: Listener) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function emit() {
  listeners.forEach((fn) => fn());
}

export function setMotion(on: boolean, persist = true) {
  store.motion = on;
  if (persist) {
    try {
      localStorage.setItem('archive:motion', on ? 'on' : 'off');
    } catch {
      /* storage unavailable: preference lasts for this visit only */
    }
  }
  document.documentElement.dataset.motion = on ? 'on' : 'off';
  emit();
}

export function setRenderer(kind: 'webgl' | 'fallback') {
  store.renderer = kind;
  document.documentElement.dataset.renderer = kind;
  emit();
}

export function markReady() {
  if (store.ready) return;
  store.ready = true;
  emit();
}

export function onFrame(fn: (r: FrameReadout) => void) {
  frameListeners.add(fn);
  return () => frameListeners.delete(fn);
}

export function emitFrame(r: FrameReadout) {
  frameListeners.forEach((fn) => fn(r));
}
