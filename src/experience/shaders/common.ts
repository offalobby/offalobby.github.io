/**
 * Shared GLSL: noise and the growth field.
 *
 * The whole world is one scalar "growth field" over the ground plane:
 *   r(p) = distance from the pith, measured in domain-warped space.
 * Its isolines are tree rings when seen from above, its terraced height reads
 * as sedimentary strata when seen from the side, and the cursor adds a point
 * charge whose 1/r potential bends the isolines exactly like equipotentials.
 *
 * KEEP IN SYNC with src/experience/core/field.ts (CPU port used for the
 * pith annotation, the cursor readout and the no-WebGL SVG fallback).
 */
export const noiseGLSL = /* glsl */ `
#ifndef OCTAVES
#define OCTAVES 3
#endif

// Dave Hoskins' sin-free hash: stable across GPUs and reproducible on the CPU.
float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

// Value noise in [-1, 1].
float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash12(i);
  float b = hash12(i + vec2(1.0, 0.0));
  float c = hash12(i + vec2(0.0, 1.0));
  float d = hash12(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y) * 2.0 - 1.0;
}

float fbm(vec2 p) {
  float s = 0.0;
  float a = 0.5;
  mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
  for (int i = 0; i < OCTAVES; i++) {
    s += a * vnoise(p);
    p = m * p;
    a *= 0.5;
  }
  return s;
}
`;

export const fieldGLSL = /* glsl */ `
// Domain warp: the slow, river-like bending visible in the reference textures.
vec2 warpField(vec2 p, float t) {
  vec2 w = vec2(
    fbm(p * 0.30 + vec2(0.0, t * 0.012)),
    fbm(p * 0.30 + vec2(5.2, 1.7 - t * 0.010))
  );
  return p + 1.1 * w;
}

// Distance from the pith in warped space, with a lobed (non-circular) trunk.
float ringRadius(vec2 p, vec2 center, float t) {
  vec2 d = warpField(p, t) - center;
  float a = atan(d.y, d.x);
  return length(d) * (1.0 + 0.05 * sin(3.0 * a + 1.3) + 0.025 * sin(7.0 * a - 0.4));
}

// Smooth terracing: flat treads with soft risers -> strata in profile.
float terrace(float h, float steps, float amount) {
  float t = h * steps;
  float stepped = (floor(t) + smoothstep(0.18, 0.82, fract(t))) / steps;
  return mix(h, stepped, amount);
}

// Interference of three point sources: the "laboratory" field (Act III).
float waveField(vec2 p, float t) {
  float s = 0.0;
  vec2 src[3];
  src[0] = vec2(-3.4, -2.2);
  src[1] = vec2(2.8, -3.1);
  src[2] = vec2(0.4, 3.3);
  for (int i = 0; i < 3; i++) {
    float d = length(p - src[i]);
    s += sin(d * 2.6 - t * 0.9) / (1.0 + 0.22 * d);
  }
  return s;
}
`;
