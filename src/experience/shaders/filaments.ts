import { noiseGLSL, fieldGLSL, surfaceGLSL } from './common';

/**
 * Filaments: thousands of hairline streaks of light that flow along the
 * contour lines, just above the surface — sap moving along growth rings, or
 * current moving along equipotentials. Near the cursor charge the contours
 * curl into circles, so the filaments visibly swirl around it.
 *
 * Stateless: each line segment is (head, tail). Both ends re-trace the same
 * path from a spawn point that is re-randomised every life cycle, by
 * integrating the contour tangent a few steps in the vertex shader.
 */
export const filamentsVertex = /* glsl */ `
${noiseGLSL}
${fieldGLSL}
${surfaceGLSL}

attribute vec4  aSeed;
attribute float aEnd;   // position along the strand: 0 = head, 1 = tail end

uniform vec2  uPith;
uniform float uFlow;

varying float vAlpha;
varying vec3  vColor;

vec2 tangentAt(vec2 p) {
  const float e = 0.04;
  float c0 = contourAt(p, ringRadius(p, uCenter, uTime));
  vec2 px = p + vec2(e, 0.0);
  vec2 pz = p + vec2(0.0, e);
  float cx = contourAt(px, ringRadius(px, uCenter, uTime));
  float cz = contourAt(pz, ringRadius(pz, uCenter, uTime));
  vec2 g = vec2(cx - c0, cz - c0);
  return vec2(-g.y, g.x) / max(length(g), 1e-5);
}

void main() {
  float life = 4.0 + 6.0 * aSeed.w;
  float t = uTime * 0.6 + aSeed.z * life;
  float cycle = floor(t / life);
  float phase = fract(t / life);

  // spawn around the pith, denser toward the centre
  float u1 = hash12(aSeed.xy * 91.7 + cycle * 1.31);
  float u2 = hash12(aSeed.yx * 53.3 + cycle * 2.17);
  float rad = 7.5 * pow(u1, 0.8);
  float ang = u2 * 6.2831853;
  vec2 p = uPith + vec2(cos(ang), sin(ang)) * rad;

  // travel along the contour; points further down the strand lag behind,
  // so the strand bends with the ring instead of cutting across it
  float travel = 1.0 + 2.2 * aSeed.x;
  float tail = 0.5 + 1.3 * aSeed.y;
  float s = max(phase * travel - aEnd * tail, 0.0);
  const int STEPS = 5;
  float h = s / float(STEPS);
  for (int i = 0; i < STEPS; i++) p += tangentAt(p) * h;

  float r, r1, r2;
  float h0 = surfaceHeight(p, r);
  float y = h0 + 0.03 + 0.12 * aSeed.w * aSeed.w;
  vec4 mv = viewMatrix * vec4(p.x, y, p.y, 1.0);
  gl_Position = projectionMatrix * mv;

  // strands seen edge-on pile up into hot seams along ridges: fade them
  const float e = 0.05;
  vec3 n = normalize(vec3(h0 - surfaceHeight(p + vec2(e, 0.0), r1), e, h0 - surfaceHeight(p + vec2(0.0, e), r2)));
  vec3 V = normalize(cameraPosition - vec3(p.x, y, p.y));
  float facing = smoothstep(0.08, 0.4, dot(n, V));

  float lifeFade = smoothstep(0.0, 0.2, phase) * (1.0 - smoothstep(0.7, 1.0, phase));
  // fade far away, and close to the lens where they would cross the text
  float distFade = smoothstep(3.5, 7.0, -mv.z) * (1.0 - smoothstep(7.0, 16.0, -mv.z));
  float along = pow(1.0 - aEnd, 1.6);              // bright head, fading tail
  vAlpha = lifeFade * distFade * facing * along * uFlow * (1.0 - uPrint) * step(1e-4, s);

  float heart = 1.0 - smoothstep(0.5, 3.2, r);
  vColor = mix(vec3(0.82, 0.86, 0.6), vec3(1.0, 0.7, 0.4), heart);
  vec2 dc = p - uCharge.xy;
  vColor *= 1.0 + 2.2 * uCharge.z * exp(-dot(dc, dc) * 1.1);
}
`;

export const filamentsFragment = /* glsl */ `
uniform float uIntensity;
varying float vAlpha;
varying vec3  vColor;

void main() {
  if (vAlpha < 0.002) discard;
  vec3 c = pow(vColor, vec3(2.2)) * vAlpha * uIntensity;
  gl_FragColor = vec4(c, 1.0);
  #include <colorspace_fragment>
}
`;
