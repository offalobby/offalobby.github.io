import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import {
  Mesh,
  OrthographicCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  Vector2,
  WebGLRenderTarget,
  LinearFilter,
} from 'three';
import {
  atmospherePassVertex,
  atmospherePassFragment,
  atmosphereVertex,
  atmosphereFragment,
} from '../shaders/atmosphere';
import { worldUniforms as U } from '../core/uniforms';
import { store } from '../core/store';

/**
 * The painted backdrop. Renders the atmosphere into a half-size texture
 * (every second frame; it drifts far too slowly for anyone to tell), then
 * draws that texture behind everything. The terrain's fog samples the same
 * texture, so distance fades into exactly the backdrop's colour.
 */
export function Atmosphere() {
  const gl = useThree((s) => s.gl);

  const pass = useMemo(() => {
    const target = new WebGLRenderTarget(1, 1, {
      depthBuffer: false,
      minFilter: LinearFilter,
      magFilter: LinearFilter,
    });
    const material = new ShaderMaterial({
      vertexShader: atmospherePassVertex,
      fragmentShader: atmospherePassFragment,
      uniforms: {
        uTime: U.uTime,
        uPrint: U.uPrint,
        uBg: U.uBg,
        uHaze: U.uHaze,
        uPaper: U.uPaper,
        uAspect: { value: 1 },
      },
      depthTest: false,
      depthWrite: false,
    });
    const geometry = new PlaneGeometry(2, 2);
    const scene = new Scene();
    const quad = new Mesh(geometry, material);
    quad.frustumCulled = false;
    scene.add(quad);
    return { target, material, geometry, scene, camera: new OrthographicCamera(), size: new Vector2() };
  }, []);

  const backdrop = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: atmosphereVertex,
        fragmentShader: atmosphereFragment,
        uniforms: U,
        depthTest: false,
        depthWrite: false,
      }),
    [],
  );
  const backdropGeometry = useMemo(() => new PlaneGeometry(2, 2), []);

  // the terrain fog and the backdrop both read this texture
  U.uAtmos.value = pass.target.texture;

  const frame = useRef(0);
  useFrame(() => {
    gl.getDrawingBufferSize(pass.size);
    const w = Math.max(1, Math.round(pass.size.x / 2));
    const h = Math.max(1, Math.round(pass.size.y / 2));
    const resized = pass.target.width !== w || pass.target.height !== h;
    if (resized) pass.target.setSize(w, h);
    // every second frame is plenty for something this slow; always on demand
    if (!resized && store.motion && frame.current++ % 2 === 1) return;

    pass.material.uniforms.uAspect.value = w / h;
    const previous = gl.getRenderTarget();
    gl.setRenderTarget(pass.target);
    gl.render(pass.scene, pass.camera);
    gl.setRenderTarget(previous);
  });

  useEffect(
    () => () => {
      pass.target.dispose();
      pass.material.dispose();
      pass.geometry.dispose();
      backdrop.dispose();
      backdropGeometry.dispose();
    },
    [pass, backdrop, backdropGeometry],
  );

  return <mesh geometry={backdropGeometry} material={backdrop} renderOrder={-1} frustumCulled={false} />;
}
