import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { EffectComposer, Bloom, ChromaticAberration, Noise, Vignette } from '@react-three/postprocessing';
import { BlendFunction, type VignetteEffect, type BloomEffect, type NoiseEffect, type ChromaticAberrationEffect } from 'postprocessing';
import { Vector2 } from 'three';
import { worldUniforms as U } from '../core/uniforms';

/**
 * The lens: bloom lets the heartwood and filaments glow into the air, a
 * whisper of chromatic fringing at the edges, film grain, and a vignette.
 * Grain and fringing vanish on the paper print, which should look printed, not filmed.
 */
export function Effects({ multisampling }: { multisampling: number }) {
  const vignette = useRef<VignetteEffect>(null);
  const bloom = useRef<BloomEffect>(null);
  const noise = useRef<NoiseEffect>(null);
  const aberration = useRef<ChromaticAberrationEffect>(null);
  const fringe = useMemo(() => new Vector2(0.0007, 0.0009), []);

  useFrame(() => {
    // 1 in the dark field, 0 on the paper print; eased so the calm arrives early
    const field = Math.pow(1 - U.uPrint.value, 1.5);
    if (vignette.current) vignette.current.darkness = 0.08 + 0.52 * field;
    if (bloom.current) bloom.current.intensity = 1.1 * field; // bright paper must not bloom
    // grain reads as texture on dark green but as TV static on bright paper
    if (noise.current) noise.current.blendMode.opacity.value = 0.45 * field;
    if (aberration.current) aberration.current.offset.set(0.0007 * field, 0.0009 * field);
  });

  return (
    <EffectComposer multisampling={multisampling} enableNormalPass={false}>
      <Bloom ref={bloom} mipmapBlur intensity={1.1} luminanceThreshold={0.42} luminanceSmoothing={0.35} radius={0.78} />
      <ChromaticAberration ref={aberration} offset={fringe} radialModulation modulationOffset={0.35} />
      <Noise ref={noise} premultiply blendFunction={BlendFunction.SOFT_LIGHT} opacity={0.45} />
      <Vignette ref={vignette} offset={0.28} darkness={0.6} />
    </EffectComposer>
  );
}
