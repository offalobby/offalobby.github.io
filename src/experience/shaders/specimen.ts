import { noiseGLSL, fieldGLSL, surfaceGLSL, atmosphereGLSL } from './common';

/**
 * The specimen: a terraced ground plane displaced on the GPU.
 * Every vertex evaluates the growth field three times (for finite-difference
 * normals), so the mesh carries no stored heights and costs ~nothing to create.
 */
export const specimenVertex = /* glsl */ `
${noiseGLSL}
${fieldGLSL}
${surfaceGLSL}

varying float vRing;
varying float vR;
varying vec3  vWorld;
varying vec3  vNormal;

void main() {
  vec2 p = (modelMatrix * vec4(position, 1.0)).xz;

  float r, r1, r2;
  float h  = surfaceHeight(p, r);
  const float e = 0.035;
  float hx = surfaceHeight(p + vec2(e, 0.0), r1);
  float hz = surfaceHeight(p + vec2(0.0, e), r2);
  vNormal = normalize(vec3(h - hx, e, h - hz));

  vRing = contourAt(p, r);
  vR = r;

  vec4 world = vec4(p.x, h, p.y, 1.0);
  vWorld = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

/**
 * Surface shading. Colours are authored in sRGB (to match the references and
 * the CSS) and converted to linear at the end so bloom and tone handling in
 * the post-processing chain see physically sensible values.
 */
export const specimenFragment = /* glsl */ `
${noiseGLSL}
${atmosphereGLSL}

uniform float uTime;
uniform float uPrint;
uniform float uFog;
uniform float uGlow;
uniform vec2  uResolution;
uniform vec3  uCharge;
uniform vec3  uBg;
uniform vec3  uHaze;
uniform vec3  uPaper;
uniform vec3  uInk;
uniform vec3  uForest;
uniform vec3  uOlive;
uniform vec3  uMoss;
uniform vec3  uOchre;
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

// Silky strands running along the contours. Smooth, low-frequency wobble (no
// high-frequency noise, which is what made the old lines look jagged), and
// each strand fades in and out along its length like a fibre.
float strands(float v, float freq, vec2 q, float seed) {
  float wob = fbm(q * 0.9 + seed) * 0.35 + fbm(q * 2.3 - seed) * 0.12;
  float fv = (v + wob) * freq;
  float line = isoline(fv, 0.45);
  float presence = smoothstep(-0.15, 0.55, vnoise(vec2(floor(fv) * 1.37, seed) + q * 0.7));
  float fade = 1.0 - smoothstep(0.18, 0.5, fwidth(fv));
  return line * presence * fade;
}

void main() {
  vec3 n = normalize(vNormal);
  vec3 V = normalize(cameraPosition - vWorld);
  vec2 q = vWorld.xz;
  float v = vRing;

  // ---- pigment: each ring is a sediment layer with its own tone ----------
  float band = floor(v);
  float hb = hash12(vec2(band, 7.0));
  float hc = hash12(vec2(band, 19.0));
  vec3 tone = mix(uForest, uOlive, smoothstep(0.0, 0.65, hb));
  tone = mix(tone, uOchre, smoothstep(0.55, 0.95, hb) * 0.9);
  tone = mix(tone, uMoss, smoothstep(0.8, 1.0, hc) * 0.7);
  tone = mix(tone, uLichen, step(0.88, hc) * 0.55);
  float f = fract(v);
  tone *= mix(1.1, 0.6, smoothstep(0.4, 1.0, f));           // earlywood -> latewood
  float heart = 1.0 - smoothstep(0.4, 2.6, vR);             // heartwood near the pith
  tone = mix(tone, uCopper, heart * 0.85);

  // ---- light: warm key from behind the formation, cool sky fill ---------
  vec3 L = normalize(uLightDir);
  float diff = clamp(dot(n, L) * 0.6 + 0.4, 0.0, 1.0);
  float sky = n.y * 0.5 + 0.5;
  float slope = smoothstep(0.25, 0.95, n.y);
  float ao = mix(0.42, 1.0, smoothstep(-0.25, 1.5, vWorld.y));
  vec3 col = tone * (0.26 * sky * vec3(0.62, 0.82, 0.92) + 0.82 * diff * vec3(1.0, 0.88, 0.68)) * ao;
  col *= mix(0.5, 1.0, slope);                               // risers read as darker strata

  // fibres: dark threads everywhere, pale threads where light grazes
  float dark = strands(v, 5.0, q, 1.7);
  float pale = strands(v, 13.0, q * 1.21, 8.2);
  col *= 1.0 - 0.42 * dark;
  col += vec3(1.0, 0.95, 0.8) * pale * 0.13 * (0.35 + diff) * slope;

  // atmospheric rim: edges facing away glow with the haze behind them
  float fres = pow(1.0 - max(dot(n, V), 0.0), 3.0);
  col += uHaze * fres * 0.3 * ao;

  // heartwood glows from within, breathing slowly; the cursor charge glows too
  float breathe = 0.85 + 0.15 * sin(uTime * 0.55);
  col += vec3(1.0, 0.62, 0.3) * heart * heart * uGlow * breathe * 0.75;
  vec2 dc = q - uCharge.xy;
  col += vec3(1.0, 0.86, 0.58) * uCharge.z * exp(-dot(dc, dc) * 2.2) * 0.22;

  // ---- woodcut print (Act V) ---------------------------------------------
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

  // ---- atmosphere: fade into the same painted haze as the backdrop -------
  vec2 uv = gl_FragCoord.xy / uResolution;
  vec3 atm = atmosphere(uv, uResolution.x / uResolution.y, uTime, uBg, uHaze, uPaper, uPrint);
  float dist = length(vWorld - cameraPosition);
  float fogF = 1.0 - exp(-pow(dist * uFog, 2.0));
  col = mix(col, atm, fogF);

  gl_FragColor = vec4(pow(max(col, vec3(0.0)), vec3(2.2)), 1.0);
  #include <colorspace_fragment>
}
`;
