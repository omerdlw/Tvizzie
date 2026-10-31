// The hundred prints on an endless wall in a black room, drawn in one
// full-screen pass. The wall bows gently away at the edges and swells
// under a magnifier that rides with the hand. A lamp follows the hand too:
// the prints it reaches come up in full colour, everything else keeps only
// a dim grey shape, and the rank cut under each print is lit the same way.
// Nothing here lifts black: an empty gap stays #000.
//
// The opening is a wave from the middle of the screen (uOpen): each print
// develops out of the dark as it reaches it, and the numerals follow
// (uNumbers).

export const MAX_PRINTS = 100;

export const WALL_FRAGMENT = `#version 300 es
precision highp float;
precision highp sampler2DArray;

in vec2 vUv;
out vec4 outColor;

uniform vec2 uRes;
uniform float uPitch;       // a row's height, device pixels
uniform vec2 uPan;          // the wall coordinate at the screen's centre
uniform vec2 uFocus;        // the magnifier, view units
uniform float uLens;
uniform float uRadius;
uniform float uBulge;
uniform vec3 uLamp;         // x, y in view units; strength

uniform sampler2DArray uPrints;
uniform vec4 uState[${MAX_PRINTS}];  // loaded, seen, lift, match
uniform float uRank[${MAX_PRINTS}];
uniform float uCount;
uniform float uMarks;
uniform float uSelected;
uniform float uOpen;
uniform float uNumbers;
uniform float uTime;

uniform sampler2D uLoupe;   // the print under the hand, sharp
uniform float uLoupeIndex;
uniform float uLoupeMix;
uniform sampler2D uDigits;  // 0-9 side by side, white on black

const float COLUMNS = 10.0;
const float GAP = 0.2;
const float RATIO = 2.0 / 3.0;
const vec3 LUMA = vec3(0.2126, 0.7152, 0.0722);

float hash(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * 0.1031);
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}

float roundedBox(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

float segment(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a;
  vec2 ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h);
}

vec3 shoulder(vec3 c) {
  float peak = max(max(c.r, c.g), c.b);
  const float K = 0.8;
  if (peak <= K) return c;
  float m = K + (1.0 - K) * (1.0 - exp(-(peak - K) / (1.0 - K)));
  return c * (m / peak);
}

void main() {
  vec2 px = vUv * uRes;
  vec2 c = (px - 0.5 * uRes) / uRes.y;

  // The lens: the magnifier under the hand, then the barrel of the view.
  vec2 d = c - uFocus;
  float g = exp(-dot(d, d) / (uRadius * uRadius));
  vec2 l = uFocus + d * (1.0 - uLens * g);
  vec2 b = l * (1.0 + uBulge * dot(l, l));

  float inner = uPitch * (1.0 - GAP);
  vec2 size = vec2(inner * RATIO, inner);
  vec2 pitch = vec2(size.x + uPitch * GAP, uPitch);
  vec2 wall = b * uRes.y / pitch + uPan;
  // Gradients from the continuous wall coordinate, so nothing seams at a
  // cell's edge.
  vec2 wx = dFdx(wall) * pitch;
  vec2 wy = dFdy(wall) * pitch;
  float aa = max(length(vec2(wx.x, wy.x)), 1e-3);

  vec2 cell = floor(wall);
  vec2 q = (wall - cell - 0.5) * pitch;
  float index = mod(cell.y * COLUMNS + cell.x, max(uCount, 1.0));
  int at = int(index);
  vec4 state = uState[at];
  float loaded = state.x;
  float seen = state.y;
  float lift = state.z;
  float match = state.w;
  float picked = 1.0 - step(0.5, abs(index - uSelected));

  // Each print develops as the opening's wave reaches its place.
  vec2 home = (cell + 0.5 - uPan) * pitch / uRes.y;
  float arrive = clamp((uOpen * 1.7 - length(home * vec2(0.9, 1.1))) / 0.32, 0.0, 1.0);
  arrive = arrive * arrive * (3.0 - 2.0 * arrive);

  // The lamp: a pool of light around the hand, over a low house level.
  vec2 toLamp = c - uLamp.xy;
  float pool = exp(-dot(toLamp, toLamp) / 0.13) * uLamp.z;
  float light = 0.15 + 0.85 * pool;

  vec2 half_ = size * 0.5 * (1.0 + 0.045 * lift) * mix(0.95, 1.0, arrive) * mix(0.93, 1.0, match);
  float sd = roundedBox(q, half_, 0.0);
  float card = 1.0 - smoothstep(-aa, aa, sd);

  vec2 uv = clamp(q / (2.0 * half_) + 0.5, 0.0, 1.0);
  vec2 gx = wx / (2.0 * half_);
  vec2 gy = wy / (2.0 * half_);
  vec3 print = textureGrad(uPrints, vec3(uv, index), gx, gy).rgb;
  if (abs(index - uLoupeIndex) < 0.5) {
    print = mix(print, textureGrad(uLoupe, uv, gx, gy).rgb, uLoupeMix);
  }
  vec3 linear = pow(print, vec3(2.2)) * loaded;

  // Colour comes with the light; the picked print and the one under the
  // hand stand in it whatever the lamp is doing.
  float lit = max(light, max(picked * 0.85, lift * 0.95));
  float grey = dot(linear, LUMA);
  vec3 face = mix(vec3(grey) * vec3(0.9, 0.94, 1.0), linear, smoothstep(0.2, 0.7, lit));
  face *= lit * arrive * mix(0.07, 1.0, match);
  // Gloss: the lamp's own reflection, small and soft, on the print's varnish.
  face += vec3(1.0, 0.96, 0.9) * exp(-dot(toLamp, toLamp) / 0.0025) * 0.05 * uLamp.z * arrive * match;

  // Seen prints carry a small tick; listed ones a ring.
  float badge = size.x * 0.075;
  vec2 mark = q - vec2(half_.x - badge * 1.7, -half_.y + badge * 1.7);
  float disc = length(mark) - badge;
  float marks = uMarks * match * arrive;
  float discMask = (1.0 - smoothstep(-aa, aa, disc)) * marks * seen;
  vec2 t = mark / badge;
  float tick = min(segment(t, vec2(-0.42, 0.02), vec2(-0.1, 0.32)), segment(t, vec2(-0.1, 0.32), vec2(0.45, -0.3)));
  float tickMask = 1.0 - smoothstep(0.1, 0.1 + aa / badge * 1.5, tick);
  face = mix(face, mix(vec3(0.9), vec3(0.02), tickMask) * max(lit, 0.6), discMask);

  vec3 color = face * card;

  // The picked print throws a little of its own colour round it.
  vec3 mean = pow(textureLod(uPrints, vec3(0.5, 0.5, index), 9.0).rgb, vec3(2.2)) * loaded;
  float halo = exp(-max(sd, 0.0) / (size.x * 0.02)) * (1.0 - card);
  color += mean * halo * picked * arrive * 0.3;

  // The rank, cut small under the print's left edge, lit like the print.
  float rank = uRank[at];
  float digits = rank < 99.5 ? 2.0 : 3.0;
  // It sits in the gap below, inside the cell, on the print's resting size.
  float th = uPitch * GAP * 0.36;
  vec2 glyph = vec2(th * 0.6, th);
  vec2 lp = q - vec2(-size.x * 0.5, size.y * 0.5 + uPitch * GAP * 0.08);
  float slot = floor(lp.x / glyph.x);
  if (lp.x >= 0.0 && lp.y >= 0.0 && lp.y <= glyph.y && slot < digits) {
    float value = mod(floor(rank / pow(10.0, digits - 1.0 - slot) + 0.001), 10.0);
    vec2 duv = vec2((value + fract(lp.x / glyph.x)) / 10.0, lp.y / glyph.y);
    float ink = textureGrad(uDigits, duv, wx / glyph / vec2(10.0, 1.0), wy / glyph / vec2(10.0, 1.0)).r;
    color += vec3(ink) * (0.12 + 0.55 * pool + 0.3 * picked) * uNumbers * match * arrive;
  }

  color = shoulder(color);
  color *= mix(0.3, 1.0, smoothstep(1.15, 0.25, length(c * vec2(0.82, 1.0))));
  color = pow(max(color, 0.0), vec3(1.0 / 2.2));
  // Grain in the light only.
  float grain = hash(floor(px / 1.5) + floor(uTime * 24.0) * 37.13) - 0.5;
  color += grain * 0.05 * dot(color, vec3(0.3333));
  outColor = vec4(max(color, 0.0), 1.0);
}`;
