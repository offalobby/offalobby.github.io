import { useEffect, useMemo } from 'react';
import { PlaneGeometry, ShaderMaterial } from 'three';
import { specimenVertex, specimenFragment } from '../shaders/specimen';
import { worldUniforms } from '../core/uniforms';
import type { QualityTier } from '../core/quality';

/**
 * The formation itself. A flat grid; all shape comes from the vertex shader,
 * so changing tiers only changes how finely the field is sampled.
 */
export function Specimen({ tier }: { tier: QualityTier }) {
  const geometry = useMemo(() => {
    const g = new PlaneGeometry(26, 26, tier.segments, tier.segments);
    g.rotateX(-Math.PI / 2);
    return g;
  }, [tier.segments]);

  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: specimenVertex,
        fragmentShader: specimenFragment,
        uniforms: worldUniforms,
        defines: { OCTAVES: tier.octaves },
      }),
    [tier.octaves],
  );

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  // The shader displaces vertices, so the CPU bounding box is meaningless.
  return <mesh geometry={geometry} material={material} frustumCulled={false} />;
}
