import { useEffect, useMemo } from 'react';
import { BufferAttribute, BufferGeometry, NormalBlending, ShaderMaterial } from 'three';
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
        blending: NormalBlending,
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

  return <points geometry={geometry} material={material} frustumCulled={false} />;
}
