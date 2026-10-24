import { Vector2, Vector3, type Texture } from 'three';
import { palette, hexToRgb, type PaletteKey } from './palette';

const v3 = (k: PaletteKey) => new Vector3(...hexToRgb(palette[k]));

/**
 * One set of uniform objects shared by every material in the world.
 * The camera rig writes to them once per frame; materials just reference them.
 */
export function createWorldUniforms() {
  return {
    uTime: { value: 0 },
    uCenter: { value: new Vector2(0.15, -0.1) },
    uCharge: { value: new Vector3(0, 0, 0) },
    uWave: { value: 0 },
    uPrint: { value: 0 },
    uStrata: { value: 0.85 },
    uDensity: { value: 3.4 },
    uFog: { value: 0.06 },
    uGrain: { value: 0.035 },
    uBg: { value: v3('deep') },
    uPaper: { value: v3('parchment') },
    uInk: { value: v3('ink') },
    uForest: { value: v3('forest') },
    uOlive: { value: v3('olive') },
    uMoss: { value: v3('moss') },
    uCopper: { value: v3('copper') },
    uLichen: { value: v3('lichen') },
    uOchre: { value: v3('ochre') },
    uHaze: { value: v3('haze') },
    uResolution: { value: new Vector2(1, 1) },
    uGlow: { value: 1 },
    uFlow: { value: 1 },
    uFocus: { value: 10 },
    uPith: { value: new Vector2(0, 0) },
    /** half-size painted atmosphere, written by <Atmosphere /> each frame */
    uAtmos: { value: null as Texture | null },
    uLightDir: { value: new Vector3(-0.7, 0.7, -0.2).normalize() },
    uPixelRatio: { value: 1 },
    uColor: { value: v3('haze') },
  };
}

export type WorldUniforms = ReturnType<typeof createWorldUniforms>;

/** Module singleton: the world is a single persistent scene. */
export const worldUniforms = createWorldUniforms();
