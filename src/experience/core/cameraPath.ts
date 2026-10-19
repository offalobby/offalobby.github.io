import { acts } from './acts';
import { palette, hexToRgb } from './palette';

/** Interpolated state for a continuous act coordinate. Reused to avoid GC. */
export interface SampledPose {
  camera: [number, number, number];
  target: [number, number, number];
  fov: number;
  wave: number;
  print: number;
  strata: number;
  density: number;
  fog: number;
  background: [number, number, number];
}

export function createSampledPose(): SampledPose {
  return {
    camera: [0, 0, 0],
    target: [0, 0, 0],
    fov: 36,
    wave: 0,
    print: 0,
    strata: 0,
    density: 3,
    fog: 0,
    background: [0, 0, 0],
  };
}

const bgRgb = acts.map((a) => hexToRgb(palette[a.background]));

// Smootherstep: zero velocity *and* acceleration at each station, so the
// camera settles at every act instead of sliding through it.
const ease = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function catmull(p0: number, p1: number, p2: number, p3: number, t: number) {
  const t2 = t * t;
  const t3 = t2 * t;
  return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
}

export const lastAct = acts.length - 1;

export function samplePose(a: number, out: SampledPose): SampledPose {
  const x = Math.min(Math.max(a, 0), lastAct);
  const i = Math.min(Math.floor(x), lastAct - 1);
  const t = ease(x - i);
  const A = acts[i];
  const B = acts[i + 1];
  const P = acts[Math.max(i - 1, 0)];
  const N = acts[Math.min(i + 2, lastAct)];

  for (let k = 0; k < 3; k++) {
    out.camera[k] = catmull(P.camera[k], A.camera[k], B.camera[k], N.camera[k], t);
    out.target[k] = catmull(P.target[k], A.target[k], B.target[k], N.target[k], t);
    out.background[k] = lerp(bgRgb[i][k], bgRgb[i + 1][k], t);
  }
  out.fov = lerp(A.fov, B.fov, t);
  out.wave = lerp(A.wave, B.wave, t);
  out.print = lerp(A.print, B.print, t);
  out.strata = lerp(A.strata, B.strata, t);
  out.density = lerp(A.density, B.density, t);
  out.fog = lerp(A.fog, B.fog, t);
  return out;
}
