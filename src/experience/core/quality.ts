/**
 * Picks a rendering tier once at startup. PerformanceMonitor can still lower
 * the pixel ratio at runtime if the frame rate drops.
 */
export interface QualityTier {
  name: 'high' | 'medium' | 'low';
  /** plane subdivisions per side */
  segments: number;
  spores: number;
  /** [min, max] device pixel ratio */
  dpr: [number, number];
  octaves: number;
  antialias: boolean;
  /** flowing filament count */
  filaments: number;
  /** bloom, lens and grain post-processing */
  post: boolean;
}

const tiers: Record<QualityTier['name'], QualityTier> = {
  high: { name: 'high', segments: 340, spores: 1400, dpr: [1, 1.5], octaves: 3, antialias: true, filaments: 9000, post: true },
  medium: { name: 'medium', segments: 230, spores: 800, dpr: [1, 1.25], octaves: 3, antialias: true, filaments: 5000, post: true },
  low: { name: 'low', segments: 150, spores: 380, dpr: [0.75, 1], octaves: 2, antialias: false, filaments: 1800, post: false },
};

export function detectTier(): QualityTier {
  if (typeof window === 'undefined') return tiers.medium;
  const forced = new URLSearchParams(location.search).get('quality');
  if (forced && forced in tiers) return tiers[forced as QualityTier['name']];

  const coarse = matchMedia('(pointer: coarse)').matches;
  const small = Math.min(innerWidth, innerHeight) < 600;
  const cores = navigator.hardwareConcurrency ?? 4;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;

  if ((coarse && small) || cores <= 2 || memory <= 2) return tiers.low;
  if (coarse || cores <= 4 || memory <= 4) return tiers.medium;
  return tiers.high;
}

/** True if a WebGL2 context can be created (three.js r163+ requires WebGL2). */
export function hasWebGL(): boolean {
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2');
    // release the probe context right away; browsers cap live contexts
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
    return !!gl;
  } catch {
    return false;
  }
}

/** One rung of the quality ladder: what the renderer is allowed to spend. */
export interface QualityStep {
  dpr: number;
  post: boolean;
  filaments: number;
}

/**
 * The rungs a struggling device steps down through, cheapest change first:
 * resolution in quarter steps, then the lens effects, then half the strands.
 * The governor only ever moves down this ladder, never up, so the canvas can
 * never oscillate between two resolutions (each change costs a visible hitch).
 */
export function qualityLadder(tier: QualityTier, deviceDpr: number): QualityStep[] {
  const ladder: QualityStep[] = [];
  let dpr = Math.min(deviceDpr, tier.dpr[1]);
  ladder.push({ dpr, post: tier.post, filaments: tier.filaments });
  while (dpr - 0.25 >= tier.dpr[0] - 1e-6) {
    dpr = Math.round((dpr - 0.25) * 100) / 100;
    ladder.push({ dpr, post: tier.post, filaments: tier.filaments });
  }
  if (tier.post) ladder.push({ dpr, post: false, filaments: tier.filaments });
  ladder.push({ dpr, post: false, filaments: Math.round(tier.filaments / 2) });
  return ladder;
}
