/**
 * Spores: sparse drifting particles that give the air depth.
 * All motion is computed in the vertex shader from a per-particle seed, so
 * the CPU uploads the buffer once and never touches it again.
 * They are pushed away from the cursor charge (like charges repel).
 */
export const sporesVertex = /* glsl */ `
attribute vec4 aSeed;

uniform float uTime;
uniform vec3  uCharge;
uniform float uPixelRatio;
uniform float uPrint;

varying float vAlpha;

void main() {
  vec3 p;
  p.x = (aSeed.x - 0.5) * 16.0;
  p.z = (aSeed.y - 0.5) * 16.0;
  float rise = 0.025 + 0.04 * aSeed.w;
  p.y = 0.35 + mod(aSeed.z * 4.2 + uTime * rise, 4.2);
  p.x += sin(uTime * 0.07 + aSeed.w * 40.0) * 0.5;
  p.z += cos(uTime * 0.05 + aSeed.z * 31.0) * 0.5;

  vec2 d = p.xz - uCharge.xy;
  float push = uCharge.z * 0.9 * exp(-dot(d, d) * 0.55);
  p.xz += normalize(d + 1e-4) * push;

  vec4 mv = viewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  float size = mix(1.2, 3.2, aSeed.w * aSeed.w);
  gl_PointSize = size * uPixelRatio * (6.0 / max(-mv.z, 0.5));

  // fade in from the floor, out at the ceiling and far away
  float yFade = smoothstep(0.35, 0.9, p.y) * (1.0 - smoothstep(3.6, 4.5, p.y));
  float zFade = 1.0 - smoothstep(9.0, 18.0, -mv.z);
  vAlpha = yFade * zFade * (1.0 - uPrint);
}
`;

export const sporesFragment = /* glsl */ `
uniform vec3 uColor;
varying float vAlpha;

void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  float a = smoothstep(0.5, 0.0, d);
  if (a * vAlpha < 0.01) discard;
  gl_FragColor = vec4(uColor, a * vAlpha * 0.55);
}
`;
