import { findPith, ringRadius, vnoise } from './field';

/**
 * Draws the specimen as a woodcut-style SVG from the same growth field the
 * shader uses. Runs at build time (Astro frontmatter), so visitors without
 * WebGL — or without JavaScript — still see the real specimen, not a stock image.
 */
export interface RingsSvg {
  viewBox: string;
  outline: string;
  rings: { d: string; dash: string }[];
}

const CX = 0.15;
const CY = -0.1;

/** Distance along a ray from the pith at which the field reaches `target`. */
function radiusAt(px: number, py: number, ang: number, target: number): number {
  const dx = Math.cos(ang);
  const dy = Math.sin(ang);
  let lo = 0;
  let hi = 7;
  for (let i = 0; i < 18; i++) {
    const mid = (lo + hi) / 2;
    if (ringRadius(px + dx * mid, py + dy * mid, CX, CY, 0) < target) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

function closedPath(pts: [number, number][]): string {
  // Catmull-Rom through the samples, emitted as cubic Béziers.
  const n = pts.length;
  const f = (v: number) => v.toFixed(2);
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d + 'Z';
}

export function buildRingsSvg(ringCount = 30, samples = 160): RingsSvg {
  const [px, py] = findPith(CX, CY, 0);
  const edge = 4.0;
  const rings: RingsSvg['rings'] = [];

  for (let k = 1; k <= ringCount; k++) {
    const target = (k / ringCount) * edge * 0.97;
    const pts: [number, number][] = [];
    for (let s = 0; s < samples; s++) {
      const a = (s / samples) * Math.PI * 2;
      const r = radiusAt(px, py, a, target);
      pts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
    // broken lines, like ink that didn't take: dash pattern from noise
    const on = 0.6 + 2.4 * (vnoise(k * 1.7, 3.1) * 0.5 + 0.5);
    const off = 0.02 + 0.12 * (vnoise(k * 2.3, 8.4) * 0.5 + 0.5);
    rings.push({ d: closedPath(pts), dash: `${on.toFixed(2)} ${off.toFixed(2)}` });
  }

  const outer: [number, number][] = [];
  for (let s = 0; s < samples * 2; s++) {
    const a = (s / (samples * 2)) * Math.PI * 2;
    const jag = 1 + 0.025 * vnoise(a * 28, 4) + 0.012 * vnoise(a * 90, 9);
    const r = radiusAt(px, py, a, edge) * jag;
    outer.push([Math.cos(a) * r, Math.sin(a) * r]);
  }

  const half = 6;
  return { viewBox: `${-half} ${-half} ${half * 2} ${half * 2}`, outline: closedPath(outer), rings };
}
