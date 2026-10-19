/**
 * Spores: drifting motes that give the air depth. Particles near the focal
 * distance are small and crisp; the ones far from it swell into soft bokeh
 * discs, so the scene reads as photographed through a lens.
 * All motion is computed in the vertex shader from a per-particle seed.
 * They are pushed away from the cursor charge (like charges repel).
 */
export const sporesVertex = /* glsl */ `
attribute vec4 aSeed;

uniform float uTime;
uniform vec3  uCharge;
uniform float uPixelRatio;
uniform float uPrint;
uniform float uFocus;

varying float vAlpha;
varying float vBlur;

void main() {
  vec3 p;
  p.x = (aSeed.x - 0.5) * 18.0;
  p.z = (aSeed.y - 0.5) * 18.0;
  float rise = 0.02 + 0.035 * aSeed.w;
  p.y = 0.3 + mod(aSeed.z * 5.5 + uTime * rise, 5.5);
  p.x += sin(uTime * 0.07 + aSeed.w * 40.0) * 0.6;
  p.z += cos(uTime * 0.05 + aSeed.z * 31.0) * 0.6;

  vec2 d = p.xz - uCharge.xy;
  float push = uCharge.z * 0.9 * exp(-dot(d, d) * 0.55);
  p.xz += normalize(d + 1e-4) * push;

  vec4 mv = viewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  float depth = -mv.z;
  vBlur = clamp(abs(depth - uFocus) / 7.0, 0.0, 1.0);
  float size = mix(1.4, 2.6, aSeed.w) + vBlur * vBlur * vBlur * 20.0;
  gl_PointSize = size * uPixelRatio * (8.0 / max(depth, 0.6));

  float yFade = smoothstep(0.3, 0.9, p.y) * (1.0 - smoothstep(4.8, 5.8, p.y));
  float zFade = 1.0 - smoothstep(14.0, 24.0, depth);
  // big blurred discs carry the same light spread thin
  vAlpha = yFade * zFade * (1.0 - uPrint) * (0.9 * (1.0 - vBlur) * (1.0 - vBlur) + 0.02);
}
`;

export const sporesFragment = /* glsl */ `
uniform vec3 uColor;
varying float vAlpha;
varying float vBlur;

void main() {
  float d = length(gl_PointCoord - 0.5);
  // crisp motes are soft dots; out-of-focus ones are wide, faint, soft-edged
  float a = smoothstep(0.5, mix(0.1, 0.3, vBlur), d) * vAlpha;
  if (a < 0.003) discard;
  gl_FragColor = vec4(pow(vec3(1.0, 0.9, 0.7), vec3(2.2)) * a * 1.2, 1.0);
  #include <colorspace_fragment>
}
`;
