import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { type LineSegments, AdditiveBlending, BufferAttribute, BufferGeometry, ShaderMaterial } from 'three';
import { filamentsVertex, filamentsFragment } from '../shaders/filaments';
import { worldUniforms } from '../core/uniforms';

/**
 * Hairlines of light flowing along the rings. Each filament is a short
 * polyline whose points share a seed; all motion happens on the GPU.
 */
const SEGMENTS = 5;

export function Filaments({ count, octaves }: { count: number; octaves: number }) {
  const geometry = useMemo(() => {
    // Each strand is a polyline of SEGMENTS pieces: SEGMENTS + 1 shared points,
    // joined by an index buffer, so every point is computed once rather than
    // twice (once for each segment that touches it).
    const points = SEGMENTS + 1;
    const verts = count * points;
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(new Float32Array(verts * 3), 3));
    const seeds = new Float32Array(verts * 4);
    const along = new Float32Array(verts);
    const index = new Uint32Array(count * SEGMENTS * 2);
    let k = 0;
    for (let i = 0; i < count; i++) {
      const s = [Math.random(), Math.random(), Math.random(), Math.random()];
      const base = i * points;
      for (let j = 0; j < points; j++) {
        seeds.set(s, (base + j) * 4);
        along[base + j] = j / SEGMENTS;
      }
      for (let j = 0; j < SEGMENTS; j++) {
        index[k++] = base + j;
        index[k++] = base + j + 1;
      }
    }
    g.setAttribute('aSeed', new BufferAttribute(seeds, 4));
    g.setAttribute('aEnd', new BufferAttribute(along, 1));
    g.setIndex(new BufferAttribute(index, 1));
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

  // fully faded out (on the paper print): skip the draw instead of shading nothing
  const ref = useRef<LineSegments>(null);
  useFrame(() => {
    if (ref.current) ref.current.visible = worldUniforms.uFlow.value * (1 - worldUniforms.uPrint.value) > 0.002;
  });

  return <lineSegments ref={ref} geometry={geometry} material={material} frustumCulled={false} />;
}
