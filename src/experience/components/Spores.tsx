import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { type Points, AdditiveBlending, BufferAttribute, BufferGeometry, ShaderMaterial } from 'three';
import { sporesVertex, sporesFragment } from '../shaders/spores';
import { worldUniforms } from '../core/uniforms';

export function Spores({ count }: { count: number }) {
  const geometry = useMemo(() => {
    const g = new BufferGeometry();
    // positions are computed in the shader; three still wants the attribute
    g.setAttribute('position', new BufferAttribute(new Float32Array(count * 3), 3));
    const seeds = new Float32Array(count * 4);
    for (let i = 0; i < seeds.length; i++) seeds[i] = Math.random();
    g.setAttribute('aSeed', new BufferAttribute(seeds, 4));
    return g;
  }, [count]);

  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: sporesVertex,
        fragmentShader: sporesFragment,
        uniforms: worldUniforms,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
      }),
    [],
  );

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  // fully faded out (on the paper print): skip the draw instead of shading nothing
  const ref = useRef<Points>(null);
  useFrame(() => {
    if (ref.current) ref.current.visible = worldUniforms.uPrint.value < 0.998;
  });

  return <points ref={ref} geometry={geometry} material={material} frustumCulled={false} />;
}
