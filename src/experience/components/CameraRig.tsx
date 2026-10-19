import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Plane, Raycaster, SRGBColorSpace, Vector2, Vector3, Color, type PerspectiveCamera } from 'three';
import { samplePose, createSampledPose, lastAct } from '../core/cameraPath';
import { worldUniforms as U } from '../core/uniforms';
import { store, emitFrame, markReady } from '../core/store';
import { findPith, ringRadius } from '../core/field';

const CHARGE_IDLE_SECONDS = 2.6;

/**
 * Drives everything that changes over time:
 *  scroll -> camera pose + field morph, pointer -> parallax + charge,
 *  and publishes a small readout for the DOM (pith position, ring number).
 */
export function CameraRig() {
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const gl = useThree((s) => s.gl);
  const size = useThree((s) => s.size);

  const tmp = useMemo(
    () => ({
      pose: createSampledPose(),
      ray: new Raycaster(),
      ndc: new Vector2(),
      plane: new Plane(new Vector3(0, 1, 0), -0.6),
      hit: new Vector3(),
      look: new Vector3(),
      proj: new Vector3(),
      clear: new Color(),
    }),
    [],
  );

  const state = useRef({
    act: store.act,
    parallax: new Vector2(),
    charge: new Vector3(0, 0, 0),
    pith: null as [number, number] | null,
    pithAt: -Infinity,
    frame: 0,
    time: 0,
  });

  useFrame((_, rawDelta) => {
    const s = state.current;
    const dt = Math.min(rawDelta, 0.1);
    const motion = store.motion;

    // ---- time and scroll ---------------------------------------------------
    if (motion) s.time += dt;
    U.uTime.value = s.time;
    const target = motion ? store.act : Math.round(store.act);
    s.act = motion ? s.act + (target - s.act) * (1 - Math.exp(-dt * 3.2)) : target;
    const pose = samplePose(Math.min(s.act, lastAct), tmp.pose);

    // ---- pith (re-located occasionally; the warp drifts very slowly) -------
    const c = U.uCenter.value;
    if (!s.pith || s.time - s.pithAt > 1.5) {
      s.pith = findPith(c.x, c.y, s.time, s.pith ?? undefined);
      s.pithAt = s.time;
    }

    // ---- camera ------------------------------------------------------------
    const p = store.pointer;
    const k = motion ? 1 - Math.exp(-dt * 2.2) : 1;
    s.parallax.x += ((motion ? p.x : 0) - s.parallax.x) * k;
    s.parallax.y += ((motion ? p.y : 0) - s.parallax.y) * k;
    const sway = motion ? Math.sin(s.time * 0.11) * 0.12 : 0;
    const lift = 1 - pose.print; // no parallax on the flat print
    // Print mode frames the pith; on narrow screens it is centred instead of offset.
    const aspect = size.width / Math.max(size.height, 1);
    const wide = Math.min(Math.max((aspect - 0.9) / 0.7, 0), 1);
    const shiftX = pose.print * (1 - wide) * -pose.target[0];
    // Act I frames the mound right of the headline; on phones, centre it again.
    const heroW = Math.max(0, 1 - s.act) * (1 - wide);
    const px = s.pith[0] * pose.print + shiftX + heroW * 1.3;
    const pz = s.pith[1] * pose.print + pose.print * (1 - wide) * 3.2 - heroW * 1.2; // phones: print rides high
    camera.position.set(
      pose.camera[0] + px + (s.parallax.x * 0.55 + sway) * lift,
      pose.camera[1] + s.parallax.y * 0.3 * lift + pose.print * (1 - wide) * 4,
      pose.camera[2] + pz - s.parallax.x * 0.25 * lift,
    );
    tmp.look.set(pose.target[0] + px, pose.target[1], pose.target[2] + pz);
    camera.lookAt(tmp.look);
    if (Math.abs(camera.fov - pose.fov) > 0.01) {
      camera.fov = pose.fov;
      camera.updateProjectionMatrix();
    }

    // ---- field uniforms ----------------------------------------------------
    U.uWave.value = pose.wave;
    U.uPrint.value = pose.print;
    U.uStrata.value = pose.strata;
    U.uDensity.value = pose.density;
    U.uFog.value = pose.fog;
    U.uBg.value.set(pose.background[0], pose.background[1], pose.background[2]);
    U.uPixelRatio.value = gl.getPixelRatio();
    tmp.clear.setRGB(pose.background[0], pose.background[1], pose.background[2], SRGBColorSpace);
    gl.setClearColor(tmp.clear, 1);

    // ---- cursor charge -----------------------------------------------------
    tmp.ndc.set(p.x, p.y);
    tmp.ray.setFromCamera(tmp.ndc, camera);
    tmp.plane.constant = -0.6 * (1 - pose.print);
    const onGround = tmp.ray.ray.intersectPlane(tmp.plane, tmp.hit) !== null;
    const idle = performance.now() / 1000 - p.lastMove > CHARGE_IDLE_SECONDS;
    const wantQ = onGround && p.inside && !idle ? 1 : 0;
    const kc = motion ? 1 - Math.exp(-dt * 5) : 1;
    if (onGround) {
      s.charge.x += (tmp.hit.x - s.charge.x) * kc;
      s.charge.y += (tmp.hit.z - s.charge.y) * kc;
    }
    s.charge.z += (wantQ - s.charge.z) * (motion ? 1 - Math.exp(-dt * (wantQ ? 3 : 1.2)) : 1);
    U.uCharge.value.copy(s.charge);

    // ---- DOM readout (throttled) -------------------------------------------
    if (s.frame++ % 4 === 0) {
      // the dome peaks at ~1.75 over the pith and flattens in print mode
      tmp.proj.set(s.pith[0], 1.75 * (1 - 0.92 * pose.print), s.pith[1]).project(camera);
      const visible = tmp.proj.z < 1 && Math.abs(tmp.proj.x) < 1.1 && Math.abs(tmp.proj.y) < 1.1;
      emitFrame({
        x: s.charge.x,
        z: s.charge.y,
        ring: Math.floor(ringRadius(s.charge.x, s.charge.y, c.x, c.y, s.time) * pose.density),
        pith: visible
          ? { x: ((tmp.proj.x + 1) / 2) * size.width, y: ((1 - tmp.proj.y) / 2) * size.height }
          : null,
      });
    }

    if (!store.ready) markReady();
  });

  return null;
}
