import { noiseGLSL, atmosphereGLSL } from './common';

/**
 * The painted atmosphere is computed in its own pass, at half the canvas
 * resolution, into a texture. It is soft and drifts very slowly, so the
 * smaller size is invisible, and both the backdrop and the terrain's fog read
 * the same texture instead of each evaluating the noise at every pixel.
 */
export const atmospherePassVertex = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = position.xy * 0.5 + 0.5;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

/** Writes raw sRGB values; consumers convert to linear themselves. */
export const atmospherePassFragment = /* glsl */ `
#define OCTAVES 3
${noiseGLSL}
${atmosphereGLSL}

uniform float uTime;
uniform float uPrint;
uniform float uAspect;
uniform vec3  uBg;
uniform vec3  uHaze;
uniform vec3  uPaper;
varying vec2  vUv;

void main() {
  gl_FragColor = vec4(atmosphere(vUv, uAspect, uTime, uBg, uHaze, uPaper, uPrint), 1.0);
}
`;

/** Full-screen backdrop in the main scene: just shows the texture. */
export const atmosphereVertex = /* glsl */ `
void main() {
  gl_Position = vec4(position.xy, 1.0, 1.0);
}
`;

export const atmosphereFragment = /* glsl */ `
uniform sampler2D uAtmos;
uniform vec2 uResolution;

void main() {
  vec3 col = texture2D(uAtmos, gl_FragCoord.xy / uResolution).rgb;
  gl_FragColor = vec4(pow(col, vec3(2.2)), 1.0);
  #include <colorspace_fragment>
}
`;
