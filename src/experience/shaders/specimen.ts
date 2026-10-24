import { noiseGLSL, fieldGLSL, surfaceGLSL } from './common';

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
varying vec3  vWob;

// Low-frequency wobble of the fibre strands. Smooth at the scale of the mesh,
// so it is computed per vertex and interpolated: the same picture for a
// fraction of the cost of evaluating it at every pixel.
float wobble(vec2 q, float seed) {
  return fbm(q * 0.9 + seed) * 0.35 + fbm(q * 2.3 - seed) * 0.12;
}

void main() {
  vec2 p = (modelMatrix * vec4(position, 1.0)).xz;
  vWob = vec3(wobble(p, 1.7), wobble(p * 1.21, 8.2), wobble(p, 3.3));

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

uniform float uTime;
uniform float uPrint;
uniform float uFog;
uniform float uGlow;
uniform vec2  uResolution;
uniform vec3  uCharge;
uniform vec2  uPith;
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
uniform sampler2D uAtmos;   // the painted atmosphere, rendered once per frame at half size

varying float vRing;
varying float vR;
varying vec3  vWorld;
varying vec3  vNormal;
varying vec3  vWob;

// Screen-space anti-aliased isoline of v at integer values, ~px pixels wide.
float isoline(float v, float px) {
  float fw = max(fwidth(v), 1e-4);
  float d = abs(fract(v + 0.5) - 0.5) / fw;
  return 1.0 - smoothstep(px * 0.5, px * 0.5 + 1.0, d);
}

// Silky strands running along the contours. Smooth, low-frequency wobble (no
// high-frequency noise, which is what made the old lines look jagged), and
// each strand fades in and out along its length like a fibre.
float strands(float v, float freq, float wob, vec2 q, float seed) {
  float fv = (v + wob) * freq;
  float line = isoline(fv, 0.45);
  float presence = smoothstep(-0.15, 0.55, vnoise(vec2(floor(fv) * 1.37, seed) + q * 0.7));
  float fade = 1.0 - smoothstep(0.18, 0.5, fwidth(fv));
  return line * presence * fade;
}

void main() {
  vec3 n = normalize(vNormal);
  vec2 q = vWorld.xz;
  float v = vRing;

  // shared by the landscape and the print
  float band = floor(v);
  float hb = hash12(vec2(band, 7.0));
  float f = fract(v);
  float heart = 1.0 - smoothstep(0.4, 2.6, vR);             // heartwood near the pith

  // uPrint is uniform, so these branches are coherent and genuinely skipped:
  // the landscape is never shaded on the finished print, and vice versa.
  vec3 col = uPaper;

  if (uPrint < 0.999) {
    vec3 V = normalize(cameraPosition - vWorld);

    // ---- pigment: each ring is a sediment layer with its own tone --------
    float hc = hash12(vec2(band, 19.0));
    vec3 tone = mix(uForest, uOlive, smoothstep(0.0, 0.65, hb));
    tone = mix(tone, uOchre, smoothstep(0.55, 0.95, hb) * 0.9);
    tone = mix(tone, uMoss, smoothstep(0.8, 1.0, hc) * 0.7);
    tone = mix(tone, uLichen, step(0.88, hc) * 0.55);
    tone *= mix(1.1, 0.6, smoothstep(0.4, 1.0, f));         // earlywood -> latewood
    tone = mix(tone, uCopper, heart * 0.85);

    // ---- light: warm key from behind the formation, cool sky fill -------
    vec3 L = normalize(uLightDir);
    float diff = clamp(dot(n, L) * 0.6 + 0.4, 0.0, 1.0);
    float sky = n.y * 0.5 + 0.5;
    float slope = smoothstep(0.25, 0.95, n.y);
    float ao = mix(0.42, 1.0, smoothstep(-0.25, 1.5, vWorld.y));
    col = tone * (0.26 * sky * vec3(0.62, 0.82, 0.92) + 0.82 * diff * vec3(1.0, 0.88, 0.68)) * ao;
    col *= mix(0.5, 1.0, slope);                             // risers read as darker strata

    // fibres: dark threads everywhere, pale threads where light grazes
    float dark = strands(v, 5.0, vWob.x, q, 1.7);
    float pale = strands(v, 13.0, vWob.y, q * 1.21, 8.2);
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
  }

  if (uPrint > 0.001) {
    // ---- printed plate (Act V): a quiet engraving on paper --------------
    // Angles are taken around the pith and noise is sampled on a circle, so the
    // outline has no seam. Ink is a deep green, not black; the plate is mostly
    // a pale wash with fine continuous rings, darkening only at the bark.
    vec2 pq = q - uPith;
    float ang = atan(pq.y, pq.x);
    vec2 circ = vec2(cos(ang), sin(ang));
    float edge = 4.0 + 0.2 * vnoise(circ * 1.6 + 2.0) + 0.05 * vnoise(circ * 9.0 + 7.0) + 0.015 * vnoise(circ * 40.0);
    float aaR = fwidth(vR);
    float inside = 1.0 - smoothstep(edge - aaR, edge + aaR, vR);
    float bark = smoothstep(edge - 0.3, edge - 0.04, vR + 0.04 * vnoise(q * 16.0));

    float wash = 0.07 + 0.05 * hb + 0.06 * smoothstep(0.55, 1.0, f);     // latewood a shade darker
    float weight = mix(0.7, 1.5, step(0.72, hb));                          // some rings cut heavier
    float rings = isoline(v, weight) * (0.7 + 0.3 * smoothstep(-0.4, 0.3, vnoise(q * 2.5 + band)));
    float grain = strands(v, 4.0, vWob.z, q, 3.3);
    float split = (1.0 - smoothstep(0.0, 0.01, abs(sin(ang + 0.9 + 0.06 * vnoise(q * 3.0)))))
                * smoothstep(0.7, 1.6, vR) * step(0.0, cos(ang + 0.9)) * (1.0 - bark);
    float inkAmt = clamp(wash + rings * 0.62 + grain * 0.12, 0.0, 1.0);
    inkAmt = mix(inkAmt, 0.8 + 0.1 * vnoise(q * 30.0), bark);
    inkAmt *= 1.0 - split * 0.7;

    vec3 printCol = mix(uPaper, uInk, inkAmt * inside);
    // the heartwood keeps a little of its warmth, printed in copper
    printCol = mix(printCol, mix(uPaper, uCopper, 0.6), heart * 0.55 * inside * (1.0 - rings * 0.5));

    // the outermost ring, still growing: a copper hairline just outside the bark,
    // with a slow light travelling around it
    float ringD = abs(vR - (edge + 0.14)) / max(aaR, 1e-4);
    float growth = 1.0 - smoothstep(0.6, 1.6, ringD);
    float travel = fract(ang / 6.2831853 - uTime * 0.012);
    float pulse = 0.45 + 0.55 * exp(-pow((1.0 - travel) * 9.0, 2.0)) + 0.55 * exp(-pow(travel * 30.0, 2.0));
    printCol = mix(printCol, uCopper * 0.95, growth * pulse * (1.0 - inside));

    col = mix(col, printCol, uPrint);
  }

  // ---- atmosphere: fade into the same painted haze as the backdrop ------
  if (uFog > 0.0) {
    vec3 atm = texture2D(uAtmos, gl_FragCoord.xy / uResolution).rgb;
    float dist = length(vWorld - cameraPosition);
    float fogF = 1.0 - exp(-pow(dist * uFog, 2.0));
    col = mix(col, atm, fogF);
  }

  gl_FragColor = vec4(pow(max(col, vec3(0.0)), vec3(2.2)), 1.0);
  #include <colorspace_fragment>
}
`;
