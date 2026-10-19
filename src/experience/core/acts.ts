import type { PaletteKey } from './palette';

/**
 * The five stations of the journey. The page's <section data-act="n"> elements
 * drive a continuous scroll coordinate `a` in [0, 4]; the camera and the field
 * interpolate between these poses. Content never lives here — only the look.
 */
export interface ActPose {
  name: string;
  camera: [number, number, number];
  target: [number, number, number];
  fov: number;
  /** 0 = growth rings, 1 = interference field */
  wave: number;
  /** 0 = landscape, 1 = flat woodcut print on paper */
  print: number;
  /** terrace (strata) strength */
  strata: number;
  /** rings per world unit */
  density: number;
  background: PaletteKey;
  fog: number;
  /** visibility of the flowing filaments, 0..1 */
  flow: number;
  /** heartwood glow strength */
  glow: number;
}

export const acts: ActPose[] = [
  {
    // I. Specimen — an oblique aerial view of the whole formation.
    name: 'specimen',
    camera: [5.2, 5.6, 8.0],
    target: [-1.8, 0.2, 0.7],
    fov: 36,
    wave: 0,
    print: 0,
    strata: 0.85,
    density: 3.4,
    background: 'deep',
    fog: 0.062,
    flow: 1,
    glow: 1.0,
  },
  {
    // II. Strata — the camera drops to grazing height so terraces read as layers.
    name: 'strata',
    camera: [-5.8, 1.55, 3.6],
    target: [0.8, 0.85, -0.9],
    fov: 30,
    wave: 0,
    print: 0,
    strata: 1,
    density: 3.4,
    background: 'deep',
    fog: 0.07,
    flow: 0.75,
    glow: 0.8,
  },
  {
    // III. Laboratory — rings relax into an interference field.
    name: 'laboratory',
    camera: [3.4, 4.2, 5.2],
    target: [-0.6, 0.3, -1.2],
    fov: 38,
    wave: 1,
    print: 0,
    strata: 0.4,
    density: 3.4,
    background: 'deep',
    fog: 0.06,
    flow: 1,
    glow: 0.6,
  },
  {
    // IV. Research — high, wide, looking across the whole field.
    // (Phase 4 adds the branching-network layer here.)
    name: 'research',
    camera: [-4.2, 7.4, 4.4],
    target: [0.4, 0, -0.6],
    fov: 40,
    wave: 0.55,
    print: 0,
    strata: 0.6,
    density: 4.2,
    background: 'deep',
    fog: 0.05,
    flow: 0.85,
    glow: 0.7,
  },
  {
    // V. Archive — straight down; the specimen becomes a woodcut print on paper.
    // In print mode camera and target are offsets from the pith (see CameraRig),
    // so the print sits to the right of the text on wide screens.
    name: 'archive',
    camera: [-3.7, 15.5, 0.7],
    target: [-3.7, 0, 0],
    fov: 34,
    wave: 0,
    print: 1,
    strata: 0,
    density: 5.2,
    background: 'parchment',
    fog: 0.0,
    flow: 0,
    glow: 0,
  },
];
