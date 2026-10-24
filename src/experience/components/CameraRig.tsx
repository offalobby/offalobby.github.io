import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Plane, Raycaster, SRGBColorSpace, Vector2, Vector3, Color, type PerspectiveCamera } from 'three';
import { samplePose, createSampledPose, lastAct } from '../core/cameraPath';
import { worldUniforms as U } from '../core/uniforms';
import { store, emitFrame, markReady } from '../core/store';
import { findPith, ringRadius } from '../core/field';

const CHARGE_IDLE_SECONDS = 2.6;
/** the charge may not travel faster than this (world units / second) */
const CHARGE_MAX_SPEED = 7;
/** pointer hits further than this from the camera (grazing views) are ignored */
const CHARGE_MAX_DISTANCE = 16;
/** camera follows the scroll position at this rate (1/s) */
const FOLLOW_RATE = 4;

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
    /** what the camera and shaders use: eased toward `pith`, never jumps */
    pithSmooth: null as [number, number] | null,
    pithAt: -Infinity,
    ring: 0,
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
    s.act = motion ? s.act + (target - s.act) * (1 - Math.exp(-dt * FOLLOW_RATE)) : target;
    // the easing is asymptotic: land exactly, so no trace of one act lingers in the next
    if (Math.abs(target - s.act) < 0.004) s.act = target;
    const pose = samplePose(Math.min(s.act, lastAct), tmp.pose);

    // ---- pith (re-located occasionally; the warp drifts very slowly) -------
    const c = U.uCenter.value;
    if (!s.pith || s.time - s.pithAt > 1.5) {
      s.pith = findPith(c.x, c.y, s.time, s.pith ?? undefined);
      s.pithAt = s.time;
    }
    // the search lands on a new point every 1.5 s; glide there instead of hopping
    if (!s.pithSmooth) s.pithSmooth = [s.pith[0], s.pith[1]];
    const kp = motion ? 1 - Math.exp(-dt * 0.8) : 1;
    s.pithSmooth[0] += (s.pith[0] - s.pithSmooth[0]) * kp;
    s.pithSmooth[1] += (s.pith[1] - s.pithSmooth[1]) * kp;
    const pith = s.pithSmooth;

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
    const px = pith[0] * pose.print + shiftX + heroW * 1.3;
    const pz = pith[1] * pose.print + pose.print * (1 - wide) * 3.2 - heroW * 1.2; // phones: print rides high
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
    // reach full paper slightly before the camera fully settles
    U.uPrint.value = Math.min(1, pose.print * 1.06);
    U.uStrata.value = pose.strata;
    U.uDensity.value = pose.density;
    U.uFog.value = pose.fog;
    U.uFlow.value = pose.flow;
    U.uGlow.value = pose.glow;
    U.uPith.value.set(pith[0], pith[1]);
    U.uFocus.value = camera.position.distanceTo(tmp.look);
    gl.getDrawingBufferSize(U.uResolution.value);
    U.uBg.value.set(pose.background[0], pose.background[1], pose.background[2]);
    U.uPixelRatio.value = gl.getPixelRatio();
    tmp.clear.setRGB(pose.background[0], pose.background[1], pose.background[2], SRGBColorSpace);
    gl.setClearColor(tmp.clear, 1);

    // ---- cursor charge -----------------------------------------------------
    tmp.ndc.set(p.x, p.y);
    tmp.ray.setFromCamera(tmp.ndc, camera);
    tmp.plane.constant = -0.6 * (1 - pose.print);
    // At grazing angles a tiny pointer move can throw the hit point far across
    // the field, and every strand would re-route at once. Ignore far hits and
    // cap how fast the charge may travel.
    const onGround =
      tmp.ray.ray.intersectPlane(tmp.plane, tmp.hit) !== null &&
      tmp.hit.distanceTo(camera.position) < CHARGE_MAX_DISTANCE;
    const idle = performance.now() / 1000 - p.lastMove > CHARGE_IDLE_SECONDS;
    const wantQ = onGround && p.inside && !idle ? 1 : 0;
    const kc = motion ? 1 - Math.exp(-dt * 4) : 1;
    if (onGround) {
      let mx = (tmp.hit.x - s.charge.x) * kc;
      let mz = (tmp.hit.z - s.charge.y) * kc;
      const step = Math.hypot(mx, mz);
      const maxStep = motion ? CHARGE_MAX_SPEED * dt : Infinity;
      if (step > maxStep) {
        mx *= maxStep / step;
        mz *= maxStep / step;
      }
      s.charge.x += mx;
      s.charge.y += mz;
    }
    s.charge.z += (wantQ - s.charge.z) * (motion ? 1 - Math.exp(-dt * (wantQ ? 3 : 1.2)) : 1);
    U.uCharge.value.copy(s.charge);

    // ---- DOM readout --------------------------------------------------------
    // The annotation must move every frame, in step with the camera, or it
    // visibly lags in steps. Only the ring number (a field lookup) is throttled.
    if (s.frame++ % 6 === 0) {
      s.ring = Math.floor(ringRadius(s.charge.x, s.charge.y, c.x, c.y, s.time) * pose.density);
    }
    // the dome peaks at ~1.75 over the pith and flattens in print mode
    tmp.proj.set(pith[0], 1.75 * (1 - 0.92 * pose.print), pith[1]).project(camera);
    const visible = tmp.proj.z < 1 && Math.abs(tmp.proj.x) < 1.1 && Math.abs(tmp.proj.y) < 1.1;
    emitFrame({
      x: s.charge.x,
      z: s.charge.y,
      ring: s.ring,
      pith: visible
        ? { x: ((tmp.proj.x + 1) / 2) * size.width, y: ((1 - tmp.proj.y) / 2) * size.height }
        : null,
    });

    if (!store.ready) markReady();
  });

  return null;
}
