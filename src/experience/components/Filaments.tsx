import { useEffect, useMemo } from 'react';
import { AdditiveBlending, BufferAttribute, BufferGeometry, ShaderMaterial } from 'three';
import { filamentsVertex, filamentsFragment } from '../shaders/filaments';
import { worldUniforms } from '../core/uniforms';

/**
 * Hairlines of light flowing along the rings. Each filament is one line
 * segment (head + tail vertex sharing a seed); all motion happens on the GPU.
 */
const SEGMENTS = 5;

export function Filaments({ count, octaves }: { count: number; octaves: number }) {
  const geometry = useMemo(() => {
    // each filament is a short polyline of SEGMENTS pieces, drawn as line segments
    const verts = count * SEGMENTS * 2;
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(new Float32Array(verts * 3), 3));
    const seeds = new Float32Array(verts * 4);
    const along = new Float32Array(verts);
    let v = 0;
    for (let i = 0; i < count; i++) {
      const s = [Math.random(), Math.random(), Math.random(), Math.random()];
      for (let j = 0; j < SEGMENTS; j++) {
        for (const e of [j / SEGMENTS, (j + 1) / SEGMENTS]) {
          seeds.set(s, v * 4);
          along[v] = e;
          v++;
        }
      }
    }
    g.setAttribute('aSeed', new BufferAttribute(seeds, 4));
    g.setAttribute('aEnd', new BufferAttribute(along, 1));
    return g;
  }, [count]);

  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: filamentsVertex,
        fragmentShader: filamentsFragment,
        // shared world uniforms plus this material's own brightness
        uniforms: { ...worldUniforms, uIntensity: { value: 1.1 } },
        // same octaves as the terrain, or the filaments drift off its rings
        defines: { OCTAVES: octaves },
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
      }),
    [octaves],
  );

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  return <lineSegments geometry={geometry} material={material} frustumCulled={false} />;
}
