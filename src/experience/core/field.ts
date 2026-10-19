/**
 * CPU port of the growth field in shaders/common.ts.
 *
 * Used where JavaScript needs to know what the GPU is drawing:
 *  - locating the pith so the "origin" annotation can point at it
 *  - the cursor readout (ring number under the pointer)
 *  - drawing the static SVG fallback at build time
 *
 * KEEP IN SYNC with shaders/common.ts. Float precision differs slightly
 * between GPU and CPU; that is fine for annotation-level accuracy.
 */

const fract = (x: number) => x - Math.floor(x);

export function hash12(x: number, y: number): number {
  let p3x = fract(x * 0.1031);
  let p3y = fract(y * 0.1031);
  let p3z = fract(x * 0.1031);
  const d = p3x * (p3y + 33.33) + p3y * (p3z + 33.33) + p3z * (p3x + 33.33);
  p3x += d;
  p3y += d;
  p3z += d;
  return fract((p3x + p3y) * p3z);
}

export function vnoise(x: number, y: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const a = hash12(ix, iy);
  const b = hash12(ix + 1, iy);
  const c = hash12(ix, iy + 1);
  const d = hash12(ix + 1, iy + 1);
  const ab = a + (b - a) * ux;
  const cd = c + (d - c) * ux;
  return (ab + (cd - ab) * uy) * 2 - 1;
}

export function fbm(x: number, y: number, octaves = 3): number {
  let s = 0;
  let a = 0.5;
  for (let i = 0; i < octaves; i++) {
    s += a * vnoise(x, y);
    // GLSL mat2(1.6,1.2,-1.2,1.6) is column-major: m*p = (1.6x - 1.2y, 1.2x + 1.6y)
    const nx = 1.6 * x - 1.2 * y;
    const ny = 1.2 * x + 1.6 * y;
    x = nx;
    y = ny;
    a *= 0.5;
  }
  return s;
}

export function warpField(x: number, y: number, t: number): [number, number] {
  const wx = fbm(x * 0.3, y * 0.3 + t * 0.012);
  const wy = fbm(x * 0.3 + 5.2, y * 0.3 + 1.7 - t * 0.01);
  return [x + 1.1 * wx, y + 1.1 * wy];
}

export function ringRadius(x: number, y: number, cx: number, cy: number, t: number): number {
  const [wx, wy] = warpField(x, y, t);
  const dx = wx - cx;
  const dy = wy - cy;
  const a = Math.atan2(dy, dx);
  return Math.hypot(dx, dy) * (1 + 0.05 * Math.sin(3 * a + 1.3) + 0.025 * Math.sin(7 * a - 0.4));
}

/**
 * Find the world-space point where the ring radius is smallest (the pith).
 * Coarse grid, then a few rounds of local refinement starting from `hint`.
 */
export function findPith(
  cx: number,
  cy: number,
  t: number,
  hint?: [number, number],
): [number, number] {
  let best: [number, number] = hint ?? [cx, cy];
  let bestR = ringRadius(best[0], best[1], cx, cy, t);
  if (!hint) {
    for (let x = -4; x <= 4; x += 0.25) {
      for (let y = -4; y <= 4; y += 0.25) {
        const r = ringRadius(x, y, cx, cy, t);
        if (r < bestR) {
          bestR = r;
          best = [x, y];
        }
      }
    }
  }
  let step = hint ? 0.08 : 0.12;
  for (let i = 0; i < 14; i++) {
    let moved = false;
    for (const [dx, dy] of [[step, 0], [-step, 0], [0, step], [0, -step]]) {
      const x = best[0] + dx;
      const y = best[1] + dy;
      const r = ringRadius(x, y, cx, cy, t);
      if (r < bestR) {
        bestR = r;
        best = [x, y];
        moved = true;
      }
    }
    if (!moved) step *= 0.5;
  }
  return best;
}
