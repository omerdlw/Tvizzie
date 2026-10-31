// Each particle lives on a curve from its spot on a film's poster to its
// cell in the portrait. The curve bows to one side by the particle's seed
// and twists a little in flight, so the swarm pours rather than slides.
// The brightest particles land first, so a face rises out of its
// highlights. Each leaves its poster in that poster's own colour and takes
// on the portrait's as it lands.
// Between directors (uDust) the posters stay out of it: the face crumbles
// into dust around itself from the top down, and the next one condenses
// out of that dust the same way.
// Landed, the face is a screen of grey dots sized by the light of their
// cells; the photograph then develops over them (PHOTO_*) and they go.

import { MAX_FILMS } from "../types";

export const SWARM_VERTEX = `#version 300 es
layout(location = 0) in vec2 aHome;
layout(location = 1) in vec2 aFace;
layout(location = 2) in vec3 aColor;
layout(location = 3) in vec3 aMeta;
layout(location = 4) in vec3 aSource;
uniform vec2 uRes;
uniform vec4 uFace;
uniform vec4 uPosters[${MAX_FILMS}];
uniform float uPhase;
uniform float uTime;
uniform vec2 uFaceGrid;
uniform vec2 uPosterGrid;
uniform float uScale;
uniform float uDust;
uniform float uFade;
out vec3 vColor;
out float vAlpha;
out float vFlight;
out float vSize;

float ease(float x) { return x * x * x * (x * (x * 6.0 - 15.0) + 10.0); }

void main() {
  int film = int(aMeta.x + 0.5);
  float seed = aMeta.y;
  vec4 poster = uPosters[film];
  vec2 face = uFace.xy + aFace * uFace.zw;
  float turn = fract(seed * 7.13) * 6.28318;
  float spread = (0.1 + fract(seed * 3.71) * 0.32) * uFace.z;
  vec2 dust = face + vec2(cos(turn), sin(turn)) * spread - vec2(0.0, 0.08 * uFace.w);
  vec2 home = mix(poster.xy + aHome * poster.zw, dust, uDust);

  float delay = mix((1.0 - aMeta.z) * 0.3, aFace.y * 0.3, uDust) + seed * 0.14;
  float t = clamp((uPhase - delay) / 0.56, 0.0, 1.0);
  float e = ease(t);

  vec2 d = face - home;
  vec2 side = normalize(vec2(-d.y, d.x) + 1e-5);
  vec2 bow = side * (seed - 0.5) * length(d) * 0.7;
  vec2 mid = (home + face) * 0.5 + bow;
  vec2 p = mix(mix(home, mid, e), mix(mid, face, e), e);
  float flight = sin(e * 3.14159);
  p += vec2(sin(uTime * 1.3 + seed * 40.0), cos(uTime * 1.1 + seed * 31.0)) * flight * 14.0 * uScale;

  vec2 clip = p / uRes * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
  float faceSize = uFace.z / uFaceGrid.x * mix(0.45, 1.22, sqrt(aMeta.z));
  float homeSize = mix(poster.z / uPosterGrid.x, faceSize * 0.6, uDust);
  gl_PointSize = max(1.0, mix(homeSize, faceSize, e) * (1.0 + flight * 0.6));
  vSize = gl_PointSize;
  vColor = mix(mix(aSource, aColor, uDust), aColor, smoothstep(0.25, 0.9, e));
  // Near-black particles add nothing but a visible grid; they stay out.
  float light = dot(aColor, vec3(0.2126, 0.7152, 0.0722));
  vAlpha = smoothstep(0.0, mix(0.08, 0.6, uDust), t) * mix(1.0, smoothstep(0.02, 0.1, light), e) * (1.0 - uFade);
  vFlight = flight;
}`;

export const SWARM_FRAGMENT = `#version 300 es
precision highp float;
in vec3 vColor;
in float vAlpha;
in float vFlight;
in float vSize;
out vec4 outColor;
void main() {
  float d = length(gl_PointCoord - 0.5);
  // One pixel of edge at rest; in flight the dots soften into motion.
  float edge = max(1.0 / vSize, vFlight * 0.3);
  float a = smoothstep(0.5, 0.5 - edge, d) * vAlpha;
  vec3 c = pow(vColor, vec3(2.2)) * (1.0 + vFlight * 0.7);
  outColor = vec4(c * a, a);
}`;

// The photograph, in black and white, drawn over the face's box. It
// develops the way the swarm landed, highlights first. Studio backdrop is
// keyed out pixel by pixel against the swarm's clean plate, wherever the
// backdrop reached in from the edges, so the sitter stands in the black
// with every strand of hair. The light falls off as vignetteAt does.
export const PHOTO_VERTEX = `#version 300 es
uniform vec2 uRes;
uniform vec4 uFace;
out vec2 vUv;
void main() {
  vec2 corner = vec2(float(gl_VertexID & 1), float(gl_VertexID >> 1));
  vUv = corner;
  vec2 p = uFace.xy + corner * uFace.zw;
  vec2 clip = p / uRes * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
}`;

export const PHOTO_FRAGMENT = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform sampler2D uPhoto;
uniform sampler2D uMatte;
uniform float uDevelop;

const vec3 LUMA = vec3(0.2126, 0.7152, 0.0722);
const vec3 SILVER = vec3(1.0, 0.985, 0.96);

void main() {
  vec3 c = texture(uPhoto, vUv).rgb;
  vec3 lin = pow(c, vec3(2.2));
  // Tone in perceptual space: set the levels, then a gentle S for body.
  float g = pow(dot(lin, LUMA), 1.0 / 2.2);
  g = clamp((g - 0.035) / 0.93, 0.0, 1.0);
  g = mix(g, g * g * (3.0 - 2.0 * g), 0.45);
  // Highlights develop first, the shadows fill in behind them.
  float d = clamp(uDevelop * 1.5 - (1.0 - g) * 0.5, 0.0, 1.0);
  g *= d * d * (3.0 - 2.0 * d);
  // The vignette, the key, and a soft edge on every side so the box never
  // shows.
  vec4 plate = texture(uMatte, vUv);
  float key = smoothstep(0.05, 0.16, distance(c, plate.rgb));
  float edgeOf = length((vUv - vec2(0.5, 0.4)) / vec2(0.5, 0.62));
  float sitter = smoothstep(0.0, 1.0, clamp((1.1 - edgeOf) / 0.75, 0.0, 1.0))
    * mix(1.0, key, plate.a);
  vec2 edge = smoothstep(vec2(0.0), vec2(0.06, 0.04), vUv)
    * smoothstep(vec2(0.0), vec2(0.06, 0.16), 1.0 - vUv);
  float keep = sitter * edge.x * edge.y;
  outColor = vec4(pow(g * SILVER, vec3(2.2)) * keep, 1.0);
}`;
