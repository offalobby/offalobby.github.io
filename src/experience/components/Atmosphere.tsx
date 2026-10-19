import { useEffect, useMemo } from 'react';
import { PlaneGeometry, ShaderMaterial } from 'three';
import { atmosphereVertex, atmosphereFragment } from '../shaders/atmosphere';
import { worldUniforms } from '../core/uniforms';

/** The painted backdrop. Drawn first, at the far plane, behind everything. */
export function Atmosphere() {
  const geometry = useMemo(() => new PlaneGeometry(2, 2), []);
  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: atmosphereVertex,
        fragmentShader: atmosphereFragment,
        uniforms: worldUniforms,
        depthTest: false,
        depthWrite: false,
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
  return <mesh geometry={geometry} material={material} renderOrder={-1} frustumCulled={false} />;
}
