// One full-screen pass draws the wall through the mapping in canon-wall.ts.
// Each one-sheet is a print under a rounded, bevelled glass, lit by a lamp
// that follows the loupe; the rest of the wall sinks into the dark. Films the
// viewer has seen carry a tick and keep their colour; the rest go grey, so the
// wall reads as a list of what is left to watch.

export const CANON_FILMS = 100;

export const CANON_FRAGMENT = `#version 300 es
precision highp float;
precision highp sampler2DArray;

in vec2 vUv;
out vec4 outColor;

uniform vec2 uRes;
uniform float uPitch;
uniform vec2 uPan;
uniform vec2 uFocus;
uniform float uLens;
uniform float uRadius;
uniform float uBulge;
uniform vec2 uLamp;

uniform sampler2DArray uPrints;
// Per film. x: how far its print has faded in, plus 2 while it is on the
// watchlist. y: seen, 0..1. z: lift under the pointer or when picked.
// w: whether it passes the filter, 0..1.
uniform vec4 uState[${CANON_FILMS}];
uniform float uCount;
// 1 once the viewer's marks are known, so the wall can grey out the unseen.
uniform float uMarks;
uniform float uSelected;

uniform float uExposure;
uniform float uTime;
uniform float uGrain;
// While the wall is seen through the doorway at the end of the tunnel, the
// polished floor there mirrors it: below the doorway, in this canvas's
// pixels (left, top, right, bottom), the wall is drawn upside down, and the
// tunnel lets it through where its floor is glossy.
uniform vec4 uMirror;
uniform float uMirrorOn;
// The print under the loupe, fetched again larger: which film it is (-1 for
// none yet), how far it has come in, and how it is cropped to the cell.
uniform sampler2D uLoupe;
uniform float uLoupeIndex;
uniform float uLoupeMix;
uniform vec2 uLoupeCrop;

const float COLUMNS = 10.0;
const float GAP = 0.14;
const float RATIO = 2.0 / 3.0;

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

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
    f.y
  );
}

// Highlights roll off on the brightest channel instead of clipping, so a
// pale poster under the lamp keeps its colours.
vec3 shoulder(vec3 c) {
  float peak = max(max(c.r, c.g), c.b);
  const float K = 0.78;
  if (peak <= K) return c;
  float m = K + (1.0 - K) * (1.0 - exp(-(peak - K) / (1.0 - K)));
  return c * (m / peak);
}

vec3 wallColour(vec2 px) {
  vec2 c = (px - 0.5 * uRes) / uRes.y;

  // The loupe, then the bow of the wall.
  vec2 d = c - uFocus;
  float g = exp(-dot(d, d) / (uRadius * uRadius));
  vec2 l = uFocus + d * (1.0 - uLens * g);
  vec2 b = l * (1.0 + uBulge * dot(l, l));

  float inner = uPitch * (1.0 - GAP);
  vec2 size = vec2(inner * RATIO, inner);
  vec2 pitch = vec2(size.x + uPitch * GAP, uPitch);
  vec2 wall = b * uRes.y / pitch + uPan;
  vec2 cell = floor(wall);
  // Where in its cell the pixel falls, in the wall's own pixels.
  vec2 q = (wall - cell - 0.5) * pitch;
  float index = mod(cell.y * COLUMNS + cell.x, max(uCount, 1.0));

  // How near the lamp the pixel is: the wall is lit around the loupe and
  // falls away into the dark.
  vec2 toLamp = c - uLamp;
  float spot = exp(-dot(toLamp, toLamp) / 0.32);
  vec3 color = vec3(0.012, 0.011, 0.011) * (0.4 + spot);

  if (index < uCount) {
    vec4 state = uState[int(index)];
    float listed = step(1.5, state.x);
    float loaded = state.x - 2.0 * listed;
    float seen = state.y;
    float lift = state.z;
    float match = state.w;
    float picked = 1.0 - step(0.5, abs(index - uSelected));

    vec2 half_ = size * 0.5 * (1.0 + 0.045 * lift) * mix(0.92, 1.0, match);
    float radius = size.x * 0.15;
    float sd = roundedBox(q, half_, radius);
    float aa = max(fwidth(sd), 1e-3);
    float card = 1.0 - smoothstep(-aa, aa, sd);

    vec2 uv = clamp(q / (2.0 * half_) + 0.5, 0.0, 1.0);
    vec3 print = texture(uPrints, vec3(uv, index)).rgb;
    if (abs(index - uLoupeIndex) < 0.5) {
      vec3 sharp = texture(uLoupe, (uv - 0.5) * uLoupeCrop + 0.5).rgb;
      print = mix(print, sharp, uLoupeMix);
    }
    print = mix(vec3(0.045), print, loaded);

    // Seen films keep their colour; the rest go grey and step back.
    float unseen = uMarks * (1.0 - seen);
    float grey = dot(print, vec3(0.2126, 0.7152, 0.0722));
    print = mix(print, vec3(grey) * 0.92, unseen * 0.88);
    print *= 1.0 - 0.42 * unseen;
    print *= mix(0.1, 1.0, match);

    // A bevelled glass over the print, lit from the lamp.
    vec2 grad = vec2(dFdx(sd), dFdy(sd));
    grad /= max(length(grad), 1e-5);
    float rim = 1.0 - smoothstep(0.0, size.x * 0.08, -sd);
    vec3 n = normalize(vec3(grad * rim * 1.3, 1.0));
    vec3 light = normalize(vec3(uLamp - c, 0.6));
    float diffuse = max(dot(n, light), 0.0);
    float specular = pow(max(dot(n, normalize(light + vec3(0.0, 0.0, 1.0))), 0.0), 70.0);
    float sheen = smoothstep(0.35, 0.0, abs(uv.x + uv.y * 0.6 - 0.25 - lift * 0.5)) * 0.05;

    float lamp = mix(0.3, 0.98, spot) + 0.08 * lift;
    vec3 face = print * lamp * (0.8 + 0.22 * diffuse);
    face += (specular * 0.18 * spot + sheen * spot + rim * 0.02) * match;

    // A tick on what has been seen, a ring on what is saved for later.
    float badge = size.x * 0.085;
    vec2 at = q - vec2(half_.x - badge * 1.7, -half_.y + badge * 1.7);
    float disc = length(at) - badge;
    float discMask = (1.0 - smoothstep(-aa, aa, disc)) * uMarks * match;
    vec2 t = at / badge;
    float tick = min(segment(t, vec2(-0.42, 0.02), vec2(-0.1, 0.32)), segment(t, vec2(-0.1, 0.32), vec2(0.45, -0.3)));
    float tickMask = 1.0 - smoothstep(0.1, 0.1 + aa / badge * 1.5, tick);
    vec3 badgeColor = mix(vec3(0.96), vec3(0.04), tickMask);
    face = mix(face, badgeColor, discMask * seen);
    float ring = 1.0 - smoothstep(0.0, aa * 1.2, abs(disc + badge * 0.12) - badge * 0.1);
    face = mix(face, vec3(0.92), ring * listed * (1.0 - seen) * uMarks * match);

    color = mix(color, face, card);

    // The film that is picked stands in a soft pool of its own light, with
    // no hard edge to it.
    float halo = exp(-max(sd, 0.0) / (size.x * 0.09)) * (1.0 - card);
    color += print * halo * picked * 0.55;

    // A soft shadow where a lifted print stands off the wall.
    float shadow = smoothstep(size.x * 0.25, 0.0, sd) * (1.0 - card) * (0.35 + 0.4 * lift);
    color *= 1.0 - shadow * 0.6;
  }

  return color;
}

void main() {
  vec2 px = vUv * uRes;
  vec2 c = (px - 0.5 * uRes) / uRes.y;
  vec3 color;

  float below = px.y - uMirror.w;
  if (uMirrorOn > 0.5 && below > 0.0 && px.x > uMirror.x && px.x < uMirror.z) {
    // The doorway seen in the floor: flipped about its foot, smeared down
    // the way polished concrete smears a light, broken up a little by the
    // surface, and fading as it comes out across the floor.
    float span = max(uMirror.w - uMirror.y, 1.0);
    float k = below / span;
    float spread = span * (0.004 + k * 0.06);
    float ripple = (noise(vec2(px.x / span * 18.0, k * 6.0)) - 0.5) * span * 0.012 * k;
    vec2 at = vec2(px.x + ripple, uMirror.w - below);
    color = (
      wallColour(at) +
      wallColour(at + vec2(0.0, spread)) +
      wallColour(at - vec2(0.0, spread)) +
      wallColour(at + vec2(0.0, spread * 2.0))
    ) * 0.25;
    color *= exp(-k * 2.2);
  } else {
    color = wallColour(px);
  }

  color = shoulder(color);
  vec2 v = c * vec2(0.8, 1.0);
  color *= mix(0.22, 1.0, smoothstep(1.1, 0.18, length(v)));
  color *= uExposure;

  float grain = hash(floor(px / 1.5) + floor(uTime * 24.0) * 37.13) - 0.5;
  color += grain * uGrain * (0.02 + 0.6 * dot(color, vec3(0.333)));
  outColor = vec4(max(color, 0.0), 1.0);
}`;
