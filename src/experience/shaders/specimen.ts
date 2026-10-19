import { noiseGLSL, fieldGLSL } from './common';

/**
 * The specimen: a terraced ground plane displaced on the GPU.
 * Every vertex evaluates the growth field three times (for finite-difference
 * normals), so the mesh carries no stored heights and costs ~nothing to create.
 */
export const specimenVertex = /* glsl */ `
${noiseGLSL}
${fieldGLSL}

uniform float uTime;
uniform vec2  uCenter;   // pith, in warped space
uniform vec3  uCharge;   // cursor charge: xz position, q
uniform float uWave;     // 0 = growth rings, 1 = interference field
uniform float uPrint;    // 0 = landscape, 1 = flat woodcut print
uniform float uStrata;   // terrace amount
uniform float uDensity;  // rings per world unit

varying float vRing;
varying float vR;
varying vec3  vWorld;
varying vec3  vNormal;

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

void main() {
  vec2 p = (modelMatrix * vec4(position, 1.0)).xz;

  float r, r1, r2;
  float h  = surfaceHeight(p, r);
  const float e = 0.035;
  float hx = surfaceHeight(p + vec2(e, 0.0), r1);
  float hz = surfaceHeight(p + vec2(0.0, e), r2);
  vNormal = normalize(vec3(h - hx, e, h - hz));

  // Contour coordinate: ring index, morphing toward the wave field,
  // plus the 1/r potential of the cursor charge (equipotential bending).
  float ringV = r * uDensity;
  float waveV = waveField(p, uTime) * 2.2 + 40.0;
  vec2 dc = p - uCharge.xy;
  float phi = uCharge.z / sqrt(dot(dc, dc) + 0.18);
  vRing = mix(ringV, waveV, uWave) + phi * 1.3;
  vR = r;

  vec4 world = vec4(p.x, h, p.y, 1.0);
  vWorld = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

export const specimenFragment = /* glsl */ `
${noiseGLSL}

uniform float uTime;
uniform float uPrint;
uniform float uFog;
uniform float uGrain;
uniform vec3  uBg;
uniform vec3  uPaper;
uniform vec3  uInk;
uniform vec3  uForest;
uniform vec3  uOlive;
uniform vec3  uMoss;
uniform vec3  uCopper;
uniform vec3  uLichen;
uniform vec3  uLightDir;

varying float vRing;
varying float vR;
varying vec3  vWorld;
varying vec3  vNormal;

// Screen-space anti-aliased isoline of v at integer values, ~px pixels wide.
float isoline(float v, float px) {
  float fw = max(fwidth(v), 1e-4);
  float d = abs(fract(v + 0.5) - 0.5) / fw;
  return 1.0 - smoothstep(px * 0.5, px * 0.5 + 1.0, d);
}

void main() {
  vec3 n = normalize(vNormal);
  float v = vRing;

  // ---- pigment: each ring is a sediment layer with its own tone ----------
  float band = floor(v);
  float hb = hash12(vec2(band, 7.0));
  vec3 base = mix(uForest, uOlive, smoothstep(0.1, 0.9, hb));
  base = mix(base, uMoss, smoothstep(0.62, 1.0, hb) * 0.85);
  base = mix(base, uLichen, smoothstep(0.82, 1.0, hash12(vec2(band, 19.0))) * 0.55);
  float heart = 1.0 - smoothstep(0.6, 2.4, vR);              // heartwood near the pith
  base = mix(base, uCopper, heart * 0.8);
  float f = fract(v);
  base *= mix(1.06, 0.7, smoothstep(0.5, 1.0, f));            // earlywood -> latewood
  base = mix(base * 0.55, base, smoothstep(-0.1, 1.3, vWorld.y)); // valleys sit in shadow

  // ---- line work ----------------------------------------------------------
  float wob = vnoise(vWorld.xz * 9.0) * 0.35 + vnoise(vWorld.xz * 31.0) * 0.12;
  float fv = v * 7.0 + wob;
  float fineFade = 1.0 - smoothstep(0.16, 0.45, fwidth(fv));  // kill moire in the distance
  float fibers = isoline(fv, 0.55) * fineFade;
  float major = isoline(v, 1.1);

  // ---- light --------------------------------------------------------------
  float diff = pow(clamp(dot(n, uLightDir) * 0.5 + 0.5, 0.0, 1.0), 1.7);
  float slope = smoothstep(0.3, 0.95, n.y);
  vec3 col = base * (0.26 + 1.0 * diff * vec3(1.0, 0.93, 0.8));
  col *= mix(0.5, 1.0, slope);
  col *= 1.0 - 0.38 * fibers;
  col *= 1.0 - 0.55 * major;
  col += uPaper * 0.06 * fibers * diff * slope;

  // ---- woodcut print (Act V) ---------------------------------------------
  vec2 q = vWorld.xz;
  float ang = atan(q.y, q.x);
  float edge = 4.0 + 0.22 * vnoise(vec2(ang * 3.0, 1.0)) + 0.06 * vnoise(vec2(ang * 28.0, 4.0));
  float inside = 1.0 - smoothstep(edge - 0.015, edge + 0.015, vR);
  float bark = smoothstep(edge - 0.32, edge - 0.05, vR + 0.08 * vnoise(q * 22.0));
  float breakup = smoothstep(-0.55, 0.1, vnoise(q * 2.2 + band * 1.7)) * smoothstep(-0.7, -0.2, vnoise(q * 9.0));
  float gaps = isoline(v, 1.3) * breakup * (1.0 - bark);
  float crack = (1.0 - smoothstep(0.0, 0.012, abs(sin(ang * 1.0 + 0.9 + 0.08 * vnoise(q * 3.0)))))
              * smoothstep(0.6, 1.4, vR) * step(0.0, cos(ang + 0.9));
  vec3 printCol = mix(uInk, uPaper * 0.96, clamp(gaps + crack * (1.0 - bark), 0.0, 1.0));
  printCol = mix(uPaper, printCol, inside);
  col = mix(col, printCol, uPrint);

  // ---- atmosphere ---------------------------------------------------------
  float dist = length(vWorld - cameraPosition);
  float fogF = 1.0 - exp(-pow(dist * uFog, 2.0));
  col = mix(col, uBg, fogF);
  col += (hash12(gl_FragCoord.xy + fract(uTime * 0.37) * 97.0) - 0.5) * uGrain;

  gl_FragColor = vec4(col, 1.0);
}
`;
