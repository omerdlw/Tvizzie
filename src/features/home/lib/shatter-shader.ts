import { THROUGH } from "./layout";
import { ACROSS, ALONG } from "./shatter";

// The opening is drawn as thousands of small tiles, one instance each. Every
// tile knows two places, its cell in the word and its cell in the band, and
// stands in one or the other. The second I of the word is a window onto the
// band, seen by a second camera from so close that the film it came through
// fills it; the camera flies into the I until it fills the frame, and there,
// where the two cameras see the same picture, the tiles change over to the
// band and the camera on it pulls back. All of it is worked out here from a
// handful of numbers, so the scroll can scrub it either way.

export const TILE_VERTEX = `#version 300 es
precision highp float;

layout(location = 0) in vec2 aCorner;
// Its cell in the word: x and y as a share of the word's box, depth as a
// share of the camera's distance, and size as a share of the box's height.
layout(location = 1) in vec4 aWord;
// Its cell in the band: the slice, across it and along it, and the letter
// whose film it shows in the word, or -1 for a loose shard.
layout(location = 2) in vec4 aCell;
layout(location = 3) in vec4 aSeed;

uniform vec2 uRes;
uniform float uPx;
uniform float uDistance;
uniform vec4 uWordBox;
uniform vec4 uBand;
uniform float uAxis;
uniform float uStart[10];
uniform float uSize[10];
uniform float uLit[10];
uniform float uLight[10];
uniform float uCount;
uniform float uAspect;
uniform float uIntro;
// 0 while the tiles stand in the word, 1 once they have landed in the band.
uniform float uLanded;
// How far the camera has flown into the I, 0..1.
uniform float uDeep;
// The camera: the point it looks at, and how far it has come in, as the
// scale it gives the plane of the screen.
uniform vec2 uLook;
uniform float uZoom;
// The camera on the band: the same camera once the tiles have landed, and
// before, the one the I looks through.
uniform vec2 uInnerLook;
uniform float uInnerZoom;
uniform float uOutro;
uniform float uCalm;
uniform float uExposure;

out vec2 vFrontUv;
out vec2 vBackUv;
flat out float vFrontLayer;
flat out float vBackLayer;
out float vFrontLight;
out float vBackLight;
out float vFacing;
out vec2 vMaskUv;
out float vMask;
flat out float vWindow;
out float vLit;
out float vShade;
out float vGlint;
out float vBright;
out float vBlur;
out float vHot;
// Where it is on the band, as the camera on the band sees it.
out vec2 vPlace;
// How far the picture runs under the slice, from one side to the other.
out vec2 vScale;
flat out vec4 vRect;
out float vRest;

const float PI = 3.14159265;
const float TAU = 6.2831853;
const vec2 GRID = vec2(${ACROSS}.0, ${ALONG}.0);

vec3 turn(vec3 v, vec3 axis, float angle) {
  float c = cos(angle);
  float s = sin(angle);
  return v * c + cross(axis, v) * s + axis * dot(axis, v) * (1.0 - c);
}

// A point of a frame, as a share of it, to the picture covering it.
vec2 cover(vec2 q, float frame) {
  vec2 s = frame > uAspect ? vec2(1.0, uAspect / frame) : vec2(frame / uAspect, 1.0);
  return (q - 0.5) * s + 0.5;
}

void main() {
  vec2 centre = uRes * 0.5;
  float small = min(uRes.x, uRes.y);
  int slice = int(aCell.x + 0.5);
  bool lettered = aCell.w > -0.5;
  bool landed = uLanded > 0.5;
  bool window = lettered && !landed && abs(aCell.w - ${THROUGH}.0) < 0.5;

  // Its cell in the band, as the slices are shared out now.
  vec2 origin;
  vec2 extent;
  vec2 cell;
  vec2 rest;
  if (uAxis < 0.5) {
    origin = uBand.xy + vec2(uStart[slice], 0.0);
    extent = vec2(uSize[slice], uBand.w);
    rest = origin + aCell.yz * extent;
    cell = extent / GRID;
  } else {
    origin = uBand.xy + vec2(0.0, uStart[slice]);
    extent = vec2(uBand.z, uSize[slice]);
    rest = origin + aCell.zy * extent;
    cell = extent / GRID.yx;
  }

  // Its cell in the word.
  vec2 home = uWordBox.xy + aWord.xy * uWordBox.zw;
  float side = aWord.w * uWordBox.w;
  float depth = aWord.z * uDistance;

  // In out of the dark, the middle of the word first, each tile tumbling
  // whole turns so that it lands face up.
  float lateness = lettered
    ? 0.1 + abs(aWord.x - 0.5) * 1.3 + aSeed.x * 0.45
    : aSeed.x * 1.7;
  float k = clamp((uIntro - lateness) / 1.25, 0.0, 1.0);
  float kk = 1.0 - pow(1.0 - k, 4.0);
  float away = aSeed.y * TAU;
  vec2 from = home + (home - centre) * 0.7 + vec2(cos(away), sin(away)) * small * (0.2 + 0.3 * aSeed.z);
  vec2 pos = mix(from, home, kk);
  float z = mix(-uDistance * (1.6 + 3.0 * aSeed.y), depth, kk);
  float tumble = TAU * (1.0 + floor(aSeed.w * 2.0)) * (1.0 - kk);
  // Each tile flashes as it locks into place.
  float locked = uIntro - lateness - 1.25;
  float hot = lettered ? (k < 1.0 ? smoothstep(0.7, 1.0, k) : exp(-locked * 4.0)) : 0.0;

  // The outro: once the words round it have gone, the band breaks from its
  // middle out, at the camera.
  vec2 middle = uBand.xy + uBand.zw * 0.5;
  float out_ = clamp(length((rest - middle) / (uBand.zw * 0.5)) / 1.42, 0.0, 1.0);
  float o = clamp((uOutro - 0.1 - 0.25 * out_ - 0.08 * aSeed.y) / 0.57, 0.0, 1.0) * (1.0 - uCalm);
  float oo = o * o;
  float settled = landed ? 1.0 - smoothstep(0.0, 0.2, o) : 0.0;
  if (landed) {
    pos = rest + (rest - centre) * oo * 0.25;
    z = oo * uDistance * (1.0 + 0.35 * aSeed.z);
  }

  // Its size: a square in the word, its cell in the band, just overlapping
  // its neighbours either way, so the seams close.
  vec2 size = landed ? cell : vec2(side) * (1.0 - 0.1 * (1.0 - kk));
  size += uPx * (landed ? 0.75 * settled : 0.5 * kk);

  bool overX = fract(aSeed.z * 7.31) > 0.5;
  vec3 axis = overX ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0);
  float angle = landed ? oo * PI * (aSeed.w - 0.5) * 3.0 : tumble;
  vec3 corner = turn(vec3(aCorner * size, 0.0), axis, angle);
  vec3 normal = turn(vec3(0.0, 0.0, 1.0), axis, angle);

  vec3 world = vec3(pos, z) + corner;
  float w = 1.0 / uZoom - world.z / uDistance;
  vec2 screen = centre + (world.xy - uLook) / max(w, 1e-4);
  vPlace = uInnerLook + (screen - centre) / uInnerZoom;
  vec2 ndc = vec2(screen.x / uRes.x * 2.0 - 1.0, 1.0 - screen.y / uRes.y * 2.0);
  float zn = clamp(-world.z / (uDistance * 6.0), -1.0, 1.0);
  gl_Position = vec4(ndc * w, zn * w, w);
  // Past the camera, gone.
  if (z > uDistance * 0.88) gl_Position = vec4(2.0, 2.0, 2.0, 1.0);

  // The faces. In the word the front is its piece of the word; in the band,
  // and on the back, its piece of the band, laid out mirrored across the
  // axis it turns over, so that it reads the right way round from behind.
  // Each face shows what lies under the tile as drawn, so where tiles
  // overlap their neighbours the picture runs on across the seam.
  vec2 back = overX ? vec2(aCorner.x, -aCorner.y) : vec2(-aCorner.x, aCorner.y);
  float frame = extent.x / max(extent.y, 1.0);
  // The film being looked at is pushed in as it opens, the way the
  // projector overscans its reel, leaving the camera room to move.
  float focus = uLit[slice] * settled * (1.0 - uCalm);
  float push = 1.0 + 0.07 * focus;
  vBackUv = (cover((rest + back * size - origin) / extent, frame) - 0.5) / push + 0.5;
  vScale = (frame > uAspect ? vec2(1.0, uAspect / frame) : vec2(frame / uAspect, 1.0)) / push;
  vBackLayer = aCell.x;
  vec2 q = (home + aCorner * size - uWordBox.xy) / uWordBox.zw;
  if (lettered && !landed) {
    vFrontUv = cover(q, uWordBox.z / uWordBox.w);
    // The letters round the I take the films after the one it opens on.
    vFrontLayer = mod(aCell.w - ${THROUGH}.0, uCount);
  } else {
    vFrontUv = (cover((rest + aCorner * size - origin) / extent, frame) - 0.5) / push + 0.5;
    vFrontLayer = aCell.x;
  }
  vFrontLight = uLight[int(vFrontLayer + 0.5)];
  vBackLight = uLight[slice];
  vMaskUv = q;
  vMask = lettered && !landed ? smoothstep(0.75, 1.0, k) : 0.0;
  vWindow = window ? 1.0 : 0.0;
  vFacing = normal.z;

  vec3 light = normalize(vec3(-0.45, -0.6, 0.66));
  vec3 halfway = normalize(light + vec3(0.0, 0.0, 1.0));
  vec3 facing = normal.z < 0.0 ? -normal : normal;
  vGlint = max(pow(max(dot(facing, halfway), 0.0), 64.0) - pow(halfway.z, 64.0), 0.0) * 1.2;
  vShade = 0.62 + 0.38 * abs(normal.z);
  vBlur = abs(z) / uDistance * 3.5 + (lettered || landed ? 0.0 : 0.8);
  float shard = lettered || landed ? 1.0 : 0.2;
  vBright = (landed ? 1.0 : smoothstep(0.0, 0.35, k)) * shard * (1.0 - smoothstep(0.55, 0.85, z / uDistance)) * uExposure;
  vHot = landed ? 0.0 : hot * (1.0 - uDeep);
  vLit = mix(1.0, uLit[slice], pow(settled, 4.0));
  vRect = vec4(origin, extent);
  vRest = settled;
}`;

export const TILE_FRAGMENT = `#version 300 es
precision highp float;
precision highp sampler2DArray;

in vec2 vFrontUv;
in vec2 vBackUv;
flat in float vFrontLayer;
flat in float vBackLayer;
in float vFrontLight;
in float vBackLight;
in float vFacing;
in vec2 vMaskUv;
in float vMask;
flat in float vWindow;
in float vLit;
in float vShade;
in float vGlint;
in float vBright;
in float vBlur;
in float vHot;
in vec2 vPlace;
in vec2 vScale;
flat in vec4 vRect;
in float vRest;

out vec4 outColor;

uniform sampler2DArray uFilms;
uniform sampler2D uWord;
uniform vec2 uRes;
uniform float uPx;
uniform float uCalm;
uniform float uAspect;
// What the I looks onto: the film the camera on the band is on, its slice
// on the band, how lit it is as the one in focus, and how far it has come up.
uniform float uTarget;
uniform vec4 uTargetRect;
uniform float uTargetLit;
uniform float uTargetLight;
uniform float uTime;
uniform float uGrain;
// The film in focus is shot as the film page's hero is: the camera leans
// after the hand and its shutter smears it as it goes; a focus puller
// follows the cursor a beat behind, with a pool of warm light round it,
// drawn out behind it while it moves; the highlights halate, and near the
// cursor they streak out sideways, as through an anamorphic lens.
uniform vec2 uCamera;
uniform vec2 uShutter;
uniform vec2 uLens;
uniform vec2 uTrail;
uniform float uRack;
uniform float uHalation;

const vec3 UNLIT = vec3(0.075, 0.072, 0.07);
const vec3 STRIKE = vec3(1.0, 0.9, 0.76);

float hash(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * 0.1031);
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}

float luma(vec3 c) {
  return dot(c, vec3(0.2126, 0.7152, 0.0722));
}

float roundedBox(vec2 p, vec2 half_, float r) {
  vec2 q = abs(p) - half_ + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

// The camera turns with the hand: the frame slides, and the side it turns
// towards comes a little nearer, the near ground more than the far.
vec2 framed(vec2 q, vec2 turn) {
  vec2 centred = q - 0.5;
  centred /= 1.0 + dot(centred, turn * vec2(0.05, 0.035));
  float depth = mix(0.35, 1.0, q.y);
  return centred + 0.5 - turn * depth * vec2(0.02, 0.012);
}

// The highlights, blurred: the light a bright part of the frame throws.
float glare(vec2 uv, float layer) {
  vec3 c = textureLod(uFilms, vec3(uv, layer), 4.0).rgb;
  return dot(max(c - 0.62, 0.0), vec3(0.3333));
}

void main() {
  bool front = vFacing >= 0.0;
  vec2 uv = front ? vFrontUv : vBackUv;
  float layer = front ? vFrontLayer : vBackLayer;
  float light = front ? vFrontLight : vBackLight;
  float lit = vLit;
  float rest = vRest;
  vec4 rect = vRect;
  vec2 scale = vScale;

  // Through the I, the band as the camera on it sees it: worked out here as
  // a landed tile of that slice would draw it, so that when the tiles land
  // the picture does not change.
  if (front && vWindow > 0.5) {
    rect = uTargetRect;
    float frame = rect.z / max(rect.w, 1.0);
    float push = 1.0 + 0.07 * uTargetLit * (1.0 - uCalm);
    scale = (frame > uAspect ? vec2(1.0, uAspect / frame) : vec2(frame / uAspect, 1.0)) / push;
    uv = ((vPlace - rect.xy) / max(rect.zw, vec2(1.0)) - 0.5) * scale + 0.5;
    layer = uTarget;
    light = uTargetLight;
    lit = uTargetLit;
    rest = 1.0;
  }

  float live = rest * (1.0 - uCalm);
  // The film in focus.
  float hero = lit * live;

  // The camera, and how far it turned while the shutter was open.
  vec2 local = (vPlace - rect.xy) / max(rect.zw, vec2(1.0));
  vec2 turned = framed(local, uCamera);
  uv += (turned - local) * scale * hero;
  vec2 motion = (turned - framed(local, uCamera - uShutter)) * scale * hero;

  vec2 du = dFdx(uv);
  vec2 dv = dFdy(uv);

  // The focus puller, in heights of the band: sharp where the lens rests,
  // the frame falling away from it; the light it gathers caught over the
  // whole exposure, so drawn out behind the cursor while the hand moves.
  vec2 here = (vPlace - uLens) / rect.w;
  vec2 trail = -uTrail / rect.w;
  float run = dot(trail, trail);
  float caught = run > 1e-8
    ? length(here - trail * clamp(dot(here, trail) / run, 0.0, 1.0))
    : length(here);
  float away = smoothstep(0.1, 0.6, length(here)) * uRack * hero;
  float pool = (1.0 - smoothstep(0.0, 0.5, caught)) * uRack * live / (1.0 + sqrt(run) * 1.5);

  float bias = vBlur + away * 1.2;
  vec2 gx = du * exp2(bias);
  vec2 gy = dv * exp2(bias);

  // The shutter stays open while the camera turns: each pixel is the
  // picture swept along its own path, every pixel starting its taps
  // somewhere else, so they never print as copies.
  float smear = length(motion / max(abs(vec2(du.x, dv.y)), vec2(1e-6)));
  vec3 picture;
  if (smear > 0.75) {
    float taps = clamp(ceil(smear / 2.5) + 2.0, 3.0, 12.0);
    float start = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
    float total = 0.0;
    picture = vec3(0.0);
    for (int i = 0; i < 12; i++) {
      if (float(i) >= taps) break;
      float t = (float(i) + start) / taps - 0.5;
      float w = 1.0 - t * t * 2.0;
      picture += textureGrad(uFilms, vec3(uv + motion * t, layer), gx, gy).rgb * w;
      total += w;
    }
    picture /= total;
  } else {
    // Out of focus, the colours part a little at the edges, as through a
    // long lens wide open.
    vec2 fringe = du * away * 0.8 * uPx;
    picture = vec3(
      textureGrad(uFilms, vec3(uv - fringe, layer), gx, gy).r,
      textureGrad(uFilms, vec3(uv, layer), gx, gy).g,
      textureGrad(uFilms, vec3(uv + fringe, layer), gx, gy).b
    );
  }
  // A mip alone is a boxy blur; a ring of taps round it rounds it off.
  float round_ = away * 0.7;
  if (round_ > 0.02) {
    float k = round_ * 4.0 * uPx;
    vec3 sum = picture;
    for (int i = 0; i < 6; i++) {
      float a = float(i) * 1.0472 + 0.4;
      sum += textureGrad(uFilms, vec3(uv + du * cos(a) * k - dv * sin(a) * k, layer), gx, gy).rgb;
    }
    picture = sum / 7.0;
  }
  vec3 c = mix(UNLIT, picture, light);

  // The light. The highlights halate, more out of focus and under the
  // cursor; near it they are drawn out sideways.
  if (live > 0.001) {
    float halo = glare(uv, layer);
    c += vec3(1.0, 0.36, 0.16) * halo * uHalation * (1.0 + away * 0.9 + pool * 0.6) * light * live;
    if (pool > 0.002) {
      float lit = 0.0;
      float total = 0.0;
      for (int i = -5; i <= 5; i++) {
        float f = float(i) / 5.0;
        float w = exp(-abs(f) * 3.0);
        lit += glare(uv + vec2(f * 0.24, 0.0), layer) * w;
        total += w;
      }
      c += vec3(0.32, 0.6, 1.0) * (lit / total) * pool * pool * 7.0 * light;
    }
    float flat_ = luma(c);
    c = mix(c, vec3(flat_), away * 0.12);
    // A pool of warm light under the cursor; the rest of the room gives way.
    float lift = pool * pool;
    c *= 1.0 + lift * 0.2 - (uRack * live - pool) * 0.07;
    c += vec3(1.0, 0.5, 0.2) * flat_ * lift * 0.05;
  }

  float alpha = 1.0;
  float rim = 0.0;
  // In the word, the type cuts the tiles clean along the letters' edges,
  // and a thin warm light sits on the cut, so that a letter over a dark
  // film still reads.
  if (vMask > 0.0) {
    float field = texture(uWord, vMaskUv).a;
    float w = max(fwidth(field) * 0.7, 1e-4);
    alpha = mix(1.0, smoothstep(0.5 - w, 0.5 + w, field), vMask);
    rim = exp(-max(field - 0.5, 0.0) / (w * 2.2)) * vMask;
  }
  // In the band, each slice has softly rounded corners.
  if (vRest > 0.0) {
    vec2 half_ = vRect.zw * 0.5;
    float d = roundedBox(vPlace - vRect.xy - half_, half_, 3.0 * uPx);
    alpha *= mix(1.0, 1.0 - smoothstep(-0.7, 0.7, d), vRest);
  }

  // The films not being looked at stand back, a little dim and drained.
  float grey = luma(c);
  c = mix(vec3(grey) * 0.9, c, mix(0.55, 1.0, lit)) * mix(0.7, 1.0, lit);
  c *= vShade;
  c += vec3(1.0, 0.95, 0.88) * vGlint * 0.55 * light;
  // Locking in, a tile runs hot and pale for a moment.
  c = mix(c, vec3(luma(c)), vHot * 0.3) * (1.0 + 1.2 * vHot) + STRIKE * vHot * 0.2;
  c += STRIKE * rim * 0.32;
  c *= vBright;

  float grain = hash(floor(gl_FragCoord.xy / 1.5) + floor(uTime * 24.0) * 37.13) - 0.5;
  c += grain * uGrain * (0.01 + 0.8 * luma(c));

  if (alpha < 0.01) discard;
  outColor = vec4(max(c, 0.0) * alpha, alpha);
}`;

// Behind the band, the light of the film being looked at spills onto the dark
// round it.
export const GLOW_FRAGMENT = `#version 300 es
precision highp float;
precision highp sampler2DArray;

in vec2 vUv;
out vec4 outColor;

uniform vec2 uRes;
uniform sampler2DArray uFilms;
uniform vec4 uBand;
uniform vec2 uLayers;
uniform vec2 uLights;
uniform float uBlend;
uniform float uGlow;
uniform float uTime;
uniform float uGrain;
uniform float uBackdrop;

float hash(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * 0.1031);
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}

float roundedBox(vec2 p, vec2 half_, float r) {
  vec2 q = abs(p) - half_ + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

void main() {
  vec2 px = vUv * uRes;
  vec3 color = vec3(0.0);
  if (uGlow > 0.0) {
    vec2 su = clamp((px - uBand.xy) / uBand.zw, 0.0, 1.0);
    vec3 a = textureLod(uFilms, vec3(su, uLayers.x), 6.5).rgb * uLights.x;
    vec3 b = textureLod(uFilms, vec3(su, uLayers.y), 6.5).rgb * uLights.y;
    vec3 spill = mix(a, b, uBlend);
    float d = roundedBox(px - uBand.xy - uBand.zw * 0.5, uBand.zw * 0.5, 0.0);
    float halo = exp(-max(d, 0.0) / (uRes.y * 0.24));
    color = spill * (halo * 0.34 + 0.035) * uGlow;
  }
  float grain = hash(floor(px / 1.5) + floor(uTime * 24.0) * 37.13) - 0.5;
  color += grain * uGrain * 0.012;
  outColor = vec4(max(color, 0.0), 1.0) * uBackdrop;
}`;
