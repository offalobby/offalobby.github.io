import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { EffectComposer, Bloom, ChromaticAberration, Noise, Vignette } from '@react-three/postprocessing';
import { BlendFunction, type VignetteEffect, type BloomEffect } from 'postprocessing';
import { Vector2 } from 'three';
import { worldUniforms as U } from '../core/uniforms';

/**
 * The lens: bloom lets the heartwood and filaments glow into the air, a
 * whisper of chromatic fringing at the edges, film grain, and a vignette.
 * All of it eases off on the paper print, which should look printed, not filmed.
 */
export function Effects({ multisampling }: { multisampling: number }) {
  const vignette = useRef<VignetteEffect>(null);
  const bloom = useRef<BloomEffect>(null);
  const fringe = useMemo(() => new Vector2(0.0007, 0.0009), []);

  useFrame(() => {
    const field = 1 - U.uPrint.value;
    if (vignette.current) vignette.current.darkness = 0.15 + 0.45 * field;
    if (bloom.current) bloom.current.intensity = 0.15 + 1.05 * field;
  });

  return (
    <EffectComposer multisampling={multisampling} enableNormalPass={false}>
      <Bloom ref={bloom} mipmapBlur intensity={1.1} luminanceThreshold={0.42} luminanceSmoothing={0.35} radius={0.78} />
      <ChromaticAberration offset={fringe} radialModulation modulationOffset={0.35} />
      <Noise premultiply blendFunction={BlendFunction.SOFT_LIGHT} opacity={0.45} />
      <Vignette ref={vignette} offset={0.28} darkness={0.6} />
    </EffectComposer>
  );
}
