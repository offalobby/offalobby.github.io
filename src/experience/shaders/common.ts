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

/**
 * The surface and its contour coordinate, shared by the terrain and the
 * filaments so filaments ride exactly on the rings the terrain draws.
 * Requires: fieldGLSL above it, and the uniforms declared here.
 */
export const surfaceGLSL = /* glsl */ `
uniform float uTime;
uniform vec2  uCenter;   // pith, in warped space
uniform vec3  uCharge;   // cursor charge: xz position, q
uniform float uWave;     // 0 = growth rings, 1 = interference field
uniform float uPrint;    // 0 = landscape, 1 = flat woodcut print
uniform float uStrata;   // terrace amount
uniform float uDensity;  // rings per world unit

float surfaceHeight(vec2 p, out float r) {
  r = ringRadius(p, uCenter, uTime);
  float dome = 1.75 * exp(-r * r * 0.075) + 0.16 * fbm(p * 0.9 + 3.1);
  float hRing = terrace(dome, 9.0, uStrata);
  float hWave = 0.55 + 0.30 * waveField(p, uTime);
  float h = mix(hRing, hWave, uWave);
  vec2 dc = p - uCharge.xy;
  h += uCharge.z * 0.2 * exp(-dot(dc, dc) * 0.9);
  return h * (1.0 - 0.92 * uPrint);
}

// Contour coordinate: ring index, morphing toward the wave field, plus the
// 1/r potential of the cursor charge (equipotential bending).
float contourAt(vec2 p, float r) {
  float ringV = r * uDensity;
  float waveV = waveField(p, uTime) * 2.2 + 40.0;
  vec2 dc = p - uCharge.xy;
  float phi = uCharge.z / sqrt(dot(dc, dc) + 0.18);
  return mix(ringV, waveV, uWave) + phi * 1.3;
}
`;

/**
 * The painterly atmosphere behind (and around) the specimen: a mottled,
 * brushed ground after the dark painted reference, with a luminous haze band
 * at the horizon. Pure function so the backdrop and the terrain's fog share it.
 * Inputs and output are sRGB.
 */
export const atmosphereGLSL = /* glsl */ `
vec3 atmosphere(vec2 uv, float aspect, float t, vec3 deep, vec3 haze, vec3 paper, float print) {
  vec2 p = vec2(uv.x * aspect, uv.y);

  // brushed mottling: warped fbm at two scales, drifting very slowly
  vec2 w = vec2(fbm(p * 1.6 + vec2(t * 0.006, 0.0)), fbm(p * 1.6 + vec2(4.3, -t * 0.005)));
  float dab = fbm(p * 3.4 + w * 1.4);
  float fine = fbm(p * 9.0 + w * 2.0);

  // vertical structure: dark canopy above, a narrow band of mist at the horizon
  float horizon = exp(-pow((uv.y - 0.62) * 4.2, 2.0));
  vec3 col = deep * (0.8 + 0.5 * uv.y);
  col = mix(col, haze * 0.42, horizon * 0.6);

  // painted dabs: lichen blue-gray, deep moss, a little madder red, as in the reference
  col = mix(col, vec3(0.20, 0.27, 0.25), smoothstep(0.0, 0.45, -dab) * 0.55);
  col = mix(col, vec3(0.24, 0.27, 0.15), smoothstep(0.1, 0.5, dab) * 0.45);
  col = mix(col, vec3(0.27, 0.15, 0.13), smoothstep(0.3, 0.6, fine) * 0.25 * (1.0 - horizon));
  col += haze * horizon * (0.1 + 0.12 * w.x);

  // paper for the printed archive: warm, faintly fibrous
  vec3 pap = paper * (0.975 + 0.03 * fine);
  return mix(col, pap, print);
}
`;
