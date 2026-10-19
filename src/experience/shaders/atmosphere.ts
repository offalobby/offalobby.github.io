import { noiseGLSL, atmosphereGLSL } from './common';

/** Full-screen painted backdrop, drawn first at the far plane. */
export const atmosphereVertex = /* glsl */ `
void main() {
  gl_Position = vec4(position.xy, 1.0, 1.0);
}
`;

export const atmosphereFragment = /* glsl */ `
#define OCTAVES 3
${noiseGLSL}
${atmosphereGLSL}

uniform float uTime;
uniform float uPrint;
uniform vec2  uResolution;
uniform vec3  uBg;
uniform vec3  uHaze;
uniform vec3  uPaper;

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution;
  vec3 col = atmosphere(uv, uResolution.x / uResolution.y, uTime, uBg, uHaze, uPaper, uPrint);
  gl_FragColor = vec4(pow(col, vec3(2.2)), 1.0);
  #include <colorspace_fragment>
}
`;
