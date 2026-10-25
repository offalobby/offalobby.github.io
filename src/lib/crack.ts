/**
 * Faint gold cracks, generated at build time.
 *
 * Each crack is derived from a seed (usually the page or entry slug), so a page
 * always has the same crack, build after build, while no two are alike. Cracks
 * are drawn as thin filled ribbons rather than strokes so the line can swell
 * and thin along its length, the way a real hairline repair does.
 */

// ---------------------------------------------------------------- random --

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Deterministic PRNG (mulberry32) seeded from a string. */
export function random(seed: string) {
  let a = hash(seed);
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Pt = [number, number];
const f = (n: number) => (Math.round(n * 10) / 10).toString();

// ---------------------------------------------------------------- ribbon --

/** A closed, softly-rounded outline around a polyline with per-point widths. */
function ribbon(points: Pt[], widths: number[]): string {
  const left: Pt[] = [];
  const right: Pt[] = [];
  for (let i = 0; i < points.length; i++) {
    const a = points[Math.max(i - 1, 0)];
    const b = points[Math.min(i + 1, points.length - 1)];
    let dx = b[0] - a[0];
    let dy = b[1] - a[1];
    const len = Math.hypot(dx, dy) || 1;
    dx /= len;
    dy /= len;
    const w = widths[i] / 2;
    left.push([points[i][0] - dy * w, points[i][1] + dx * w]);
    right.push([points[i][0] + dy * w, points[i][1] - dx * w]);
  }
  const outline = [...left, ...right.reverse()];
  // quadratic smoothing through edge midpoints: organic lacquer edges
  let d = `M${f(outline[0][0])} ${f(outline[0][1])}`;
  for (let i = 1; i < outline.length - 1; i++) {
    const p = outline[i];
    const n = outline[i + 1];
    d += `Q${f(p[0])} ${f(p[1])} ${f((p[0] + n[0]) / 2)} ${f((p[1] + n[1]) / 2)}`;
  }
  const last = outline[outline.length - 1];
  return `${d}L${f(last[0])} ${f(last[1])}Z`;
}

// ------------------------------------------------------------------ seam --

export interface SeamOptions {
  /** extent along the seam, in viewBox units */
  length?: number;
  /** thickness of the band the main line wanders within */
  span?: number;
  /** typical width of the gold line */
  weight?: number;
  /** how many side cracks branch off */
  branches?: number;
  /** 'h' runs left→right, 'v' runs top→bottom */
  orientation?: 'h' | 'v';
}

export interface Seam {
  viewBox: string;
  paths: string[];
}

export function seam(seed: string, opts: SeamOptions = {}): Seam {
  const { length = 1000, span = 36, weight = 3.2, branches = 2, orientation = 'h' } = opts;
  const r = random(seed);

  // main line: uneven straight-ish segments with angular kinks, like a real break
  const n = 9 + Math.floor(r() * 8);
  const steps = Array.from({ length: n }, () => 0.4 + r());
  const total = steps.reduce((a, b) => a + b, 0);
  const main: Pt[] = [[-12, span * (0.3 + r() * 0.4)]];
  const widths: number[] = [weight];
  let x = -12;
  for (let i = 0; i < n; i++) {
    x += (steps[i] / total) * (length + 24);
    const prev = main[main.length - 1][1];
    const y = Math.min(span * 0.85, Math.max(span * 0.15, prev + (r() - 0.5) * span * 0.6));
    main.push([x, y]);
    // pools of lacquer where the break changes direction
    widths.push(weight * (0.5 + r() * 0.8) * (r() < 0.16 ? 1.9 : 1));
  }
  const paths = [ribbon(main, widths)];

  // side cracks: leave the main line at an angle and taper to nothing
  for (let b = 0; b < branches; b++) {
    const k = 2 + Math.floor(r() * (main.length - 4));
    const [ox, oy] = main[k];
    const side = r() < 0.5 ? -1 : 1;
    let ang = side * (0.55 + r() * 0.7) + (r() < 0.5 ? 0 : Math.PI);
    const segs = 3 + Math.floor(r() * 2);
    const reach = span * (0.7 + r() * 1.4);
    const pts: Pt[] = [[ox, oy]];
    const ws: number[] = [widths[k] * 0.85];
    for (let s = 1; s <= segs; s++) {
      ang += (r() - 0.5) * 0.7;
      const step = reach / segs;
      const [px, py] = pts[pts.length - 1];
      pts.push([px + Math.cos(ang) * step * 2.2, py + Math.sin(ang) * step]);
      ws.push(weight * 0.75 * (1 - s / segs) + 0.15);
    }
    paths.push(ribbon(pts, ws));
  }

  if (orientation === 'v') {
    // same geometry, rotated into a top→bottom seam
    const swap = (d: string) =>
      d.replace(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g, (_, a: string, b: string) => `${b} ${a}`);
    return { viewBox: `0 0 ${span} ${length}`, paths: paths.map(swap) };
  }
  return { viewBox: `0 0 ${length} ${span}`, paths };
}
