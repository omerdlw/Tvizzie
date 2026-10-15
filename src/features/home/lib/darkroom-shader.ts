// The darkroom, in linear light. The room is drawn in one pass: the wall
// with the safelight on it, the line across it with its pegs and the prints
// that have come together on them, the bench, and the three trays on the
// bench with the sheet developing in the middle one under its bath. The
// prints still coming together, or going back to dust, are drawn over it as
// grains of dust in a second pass, one point a grain. The frame is
// developed afterwards by the tunnel's bloom and composite passes.
//
// One lamp lights everything: the safelight, deep amber, mounted on the wall
// above the bench and turned down at it. Where a print is looked at, a
// white inspection lamp comes on over it and shows its colours.

import {
  ATLAS_COLUMNS,
  ATLAS_ROWS,
  MAX_PRINTS,
  PER_DIRECTOR,
  SHEET_BORDER,
} from "./darkroom";

const SHARED = `
uniform vec2 uRes;
uniform float uTime;
// The room coming up out of the dark, 0..1.
uniform float uLit;
// The lens's focal length, the horizon, and how far off the wall is.
uniform vec3 uLens;
// The safelight: its middle on the screen and half its size.
uniform vec4 uLamp;
// The line's height at the middle and its rise to the screen's edges.
uniform vec2 uLine;
// From one print to the next, one director's prints and the gap after
// them, how far the line is drawn along, and the paper round a picture.
uniform vec4 uRow;
// Half a print's picture.
uniform vec2 uPrint;
// How far each print has come together, 0 dust and 1 whole; how many
// prints there are; and how fast the line is moving.
uniform float uForm[${MAX_PRINTS}];
uniform float uCount;
uniform float uSwing;
uniform sampler2D uAtlas;
// Grains of dust across and down a print's paper.
uniform vec2 uCells;

const vec3 AMBER = vec3(1.0, 0.27, 0.035);
const vec3 WHITE = vec3(1.0, 0.95, 0.88);
const vec3 PAPER = vec3(0.86, 0.84, 0.79);
const float PER = ${PER_DIRECTOR.toFixed(1)};

float hash(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * 0.1031);
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}

float luma(vec3 c) {
  return dot(c, vec3(0.2126, 0.7152, 0.0722));
}

float aspectOf() {
  return uRes.x / uRes.y;
}

vec3 onWall(vec2 p) {
  float z = uLens.z;
  return vec3(p.x * z / uLens.x, (p.y - uLens.y) * z / uLens.x, z);
}

// The lamp, in the world: on the wall, standing out from it on a bracket.
vec3 lampAt() {
  float z = uLens.z - 0.14;
  return vec3(uLamp.x * z / uLens.x, (uLamp.y - uLens.y) * z / uLens.x, z);
}

// The prints hang out from the wall, in the spill round the lamp's cone as
// much as in it: lit more evenly than the wall behind them.
vec3 printLight(vec2 p) {
  vec3 to = lampAt() - (onWall(p) - vec3(0.0, 0.0, 0.025));
  return AMBER * 0.034 / (dot(to, to) + 0.05) * uLit;
}

float lineY(float x) {
  float u = x / max(aspectOf() * 0.5, 0.01);
  return uLine.x + uLine.y * u * u;
}

// Where print i hangs: its director's prints are in the middle of the
// screen when the line has been drawn along to that director.
float printX(int i) {
  float g = floor(float(i) / PER);
  float j = float(i) - g * PER;
  return (j - (PER - 1.0) * 0.5) * uRow.x + (g - uRow.z) * uRow.y;
}

// How print i turns on its peg: a little, all the time, and against the
// line's pull while it moves.
float sway(int i) {
  float f = float(i);
  return 0.016 * sin(uTime * (0.9 + 0.11 * mod(f, 7.0)) + f * 2.3) +
    0.005 * sin(uTime * 2.1 + f * 4.1) + clamp(uSwing, -1.0, 1.0) * 0.16;
}

// A print's picture, from the atlas of every print.
vec3 atlasAt(int i, vec2 uv, float lod) {
  uv = clamp(uv, 0.004, 0.996);
  float column = mod(float(i), ${ATLAS_COLUMNS.toFixed(1)});
  float row = floor(float(i) / ${ATLAS_COLUMNS.toFixed(1)});
  vec2 at = vec2(
    (column + uv.x) / ${ATLAS_COLUMNS.toFixed(1)},
    (row + uv.y) / ${ATLAS_ROWS.toFixed(1)}
  );
  return pow(textureLod(uAtlas, at, lod).rgb, vec3(2.2));
}

float rand(float n) {
  return hash(vec2(n * 0.1317, n * 0.0731 + 4.1));
}

// How far a grain of a print has come home, 0..1, for how far its print has
// come together: each grain in its own time, the ones nearer the edge the
// print comes in by (or goes out by) a little sooner. A grain is the cell
// of the paper at local, from -1 to 1 across and down.
float homing(int i, vec2 cell, float form, float x) {
  float id = float(i) * uCells.x * uCells.y + cell.y * uCells.x + cell.x;
  float across = (cell.x + 0.5) / uCells.x * 2.0 - 1.0;
  float lead = x > 0.0 ? 0.5 - 0.5 * across : 0.5 + 0.5 * across;
  float delay = rand(id) * 0.5 + lead * 0.15;
  return clamp((form - delay) / 0.35, 0.0, 1.0);
}

// Under the safelight a print is only its tones, lifted a little so the
// shadows still read.
vec3 underSafelight(vec3 rgb) {
  return mix(vec3(luma(rgb)), rgb, 0.12) * 0.85 + 0.06;
}
`;

export const DARKROOM_FRAGMENT = `#version 300 es
precision highp float;

in vec2 vUv;
out vec4 outColor;
${SHARED}
// The middle tray and the sheet in it, on the bench: middle and half size.
uniform vec4 uTray;
uniform vec4 uSheet;
// The portrait on the sheet, and the one the bath is washing away: whether
// there is a sheet, how far it has come up, and how it is fitted.
uniform sampler2D uPortrait;
uniform sampler2D uWas;
uniform vec2 uPortraitFit;
uniform vec2 uWasFit;
uniform float uDevelop;
uniform float uWasDevelop;
uniform float uHasNow;
uniform float uHasWas;
// The wave the bath is rocked with when the sheet changes, 0..1 across.
uniform float uWave;
// The print under the inspection lamp, and how far the lamp is up.
uniform vec2 uInspect;

const float TRAY_H = 0.022;
const float BATH = 0.015;
const float RIM = 0.014;
const float GAP = 0.05;
const float SHEET_BORDER = ${SHEET_BORDER};

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float sum = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 4; i++) {
    sum += noise(p) * amp;
    p = p * 2.03 + vec2(1.7, 9.2);
    amp *= 0.5;
  }
  return sum;
}

// 1 inside a shape whose distance is d, 0 outside, over a soft edge.
float fill(float d, float soft) {
  return 1.0 - smoothstep(-soft, soft, d);
}

float box(vec2 p, vec2 size, float r) {
  vec2 d = abs(p) - size + r;
  return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0) - r;
}

// The safelight's light arriving at a point with a normal: it falls off
// with distance and is thrown down and out from the wall, not up it.
vec3 safelight(vec3 w, vec3 n) {
  vec3 to = lampAt() - w;
  float d2 = dot(to, to);
  vec3 l = to * inversesqrt(d2);
  float cone = pow(max(dot(-l, normalize(vec3(0.0, -0.8, -0.6))), 0.0), 2.2);
  float lambert = max(dot(n, l), 0.0);
  return AMBER * lambert * (0.02 + cone) * 0.085 / (d2 + 0.02) * uLit;
}

// The lamp itself: a black box with a glass of amber filter in it, on a
// bracket screwed to the wall, its cord running up out of sight.
vec3 lampGlass(vec2 p, out float cover) {
  vec2 q = p - uLamp.xy;
  vec2 size = uLamp.zw;
  float aa = 1.5 / uRes.y;
  float body = box(q, size + 0.007, 0.006);
  float glass = box(q, size - 0.003, 0.003);
  float arm = box(q - vec2(0.0, size.y + 0.016), vec2(0.0028, 0.016), 0.001);
  float plate = box(q - vec2(0.0, size.y + 0.033), vec2(0.016, 0.0045), 0.002);
  float sag = 0.006 * sin(clamp((q.y - size.y) * 6.0, 0.0, 3.1416));
  float cord = abs(q.x - 0.009 - sag) - 0.0011;
  cord = max(cord, size.y + 0.036 - q.y);
  float frame = min(min(body, arm), min(plate, cord));
  cover = fill(frame, aa);
  float shine = fill(glass, aa);
  // The housing catches the glow of its own glass along its edges.
  float rim = exp(-max(glass, 0.0) * 260.0);
  vec3 metal = vec3(0.016) + AMBER * 0.35 * rim * step(body, 0.0);
  // The glass burns hottest in its middle, where the bulb is behind it.
  vec2 g = q / size;
  float hot = exp(-dot(g, g) * 1.8);
  vec3 glow = mix(AMBER * 2.0, vec3(1.0, 0.58, 0.22) * 4.6, hot) *
    (0.96 + 0.04 * noise(q * 900.0));
  return mix(metal, glow, shine) * uLit;
}

// A print hanging on its peg: where in its paper a screen point falls, and
// whether it is on the paper, the picture or the peg.
struct Hang {
  vec2 q;
  float paper;
  float picture;
  float peg;
  vec2 uv;
};

Hang hang(vec2 p, float x, float angle) {
  Hang h;
  vec2 pin = vec2(x, lineY(x) - 0.004);
  vec2 d = p - pin;
  float c = cos(angle);
  float s = sin(angle);
  vec2 q = vec2(c * d.x + s * d.y, -s * d.x + c * d.y);
  vec2 size = uPrint + uRow.w;
  float aa = 1.5 / uRes.y;
  h.q = q - vec2(0.0, -size.y - 0.003);
  h.paper = fill(box(h.q, size, 0.002), aa);
  h.picture = fill(box(h.q, uPrint, 0.0), aa);
  h.uv = vec2(0.5 + 0.5 * h.q.x / uPrint.x, 0.5 - 0.5 * h.q.y / uPrint.y);
  float pw = size.x * 0.09 + 0.002;
  h.peg = fill(box(q - vec2(0.0, -0.002), vec2(pw, pw * 2.6), pw * 0.4), aa);
  return h;
}

// How a print looks: its paper and picture under the safelight, and under
// the inspection lamp where that is on.
vec3 shadePrint(Hang h, vec3 rgb, float inspect, vec2 p) {
  vec3 lit = printLight(p);
  // A wet print curls a little toward its edges.
  float curl = 1.0 - 0.18 * pow(abs(h.q.x) / (uPrint.x + uRow.w), 2.0);
  vec3 albedo = mix(PAPER, underSafelight(rgb), h.picture);
  vec3 trueColor = mix(PAPER, rgb, h.picture);
  return (albedo * lit + trueColor * WHITE * inspect * 0.55) * curl;
}

vec3 shadePeg(Hang h, float inspect, vec2 p) {
  vec3 wood = vec3(0.42, 0.27, 0.15);
  float side = 0.7 + 0.3 * smoothstep(-0.01, 0.01, h.q.x);
  return wood * (printLight(p) * 1.4 + WHITE * inspect * 0.2) * side;
}

// The prints a screen point could fall on: the nearest along the line and
// the one either side of it.
int nearestPrint(float x) {
  float g = floor(x / uRow.y + uRow.z + 0.5);
  float local = x - (g - uRow.z) * uRow.y;
  float j = floor(local / uRow.x + (PER - 1.0) * 0.5 + 0.5);
  return int(g * PER + j);
}

// The wall: dark paint, a little uneven, lit by the safelight.
vec3 wall(vec2 p) {
  vec3 w = onWall(p);
  float paint = 0.1 + 0.03 * fbm(p * vec2(9.0, 7.0)) + 0.012 * noise(p * 140.0);
  return vec3(paint) * safelight(w, vec3(0.0, 0.0, -1.0));
}

// The shadow the whole prints and the line throw on the wall, the lamp
// being above and in front of them.
float wallShadow(vec2 p) {
  float dark = 0.0;
  vec2 off = vec2(0.0, -0.016);
  int middle = nearestPrint(p.x - off.x);
  for (int k = -1; k <= 1; k++) {
    int i = middle + k;
    if (i < 0 || float(i) >= uCount || uForm[i] < 0.999) continue;
    off.x = (printX(i) - uLamp.x) * 0.025;
    Hang h = hang(p - off, printX(i), sway(i));
    float soft = box(h.q, uPrint + uRow.w, 0.004);
    dark = max(dark, fill(soft - 0.004, 0.008) * 0.55);
  }
  float line = abs(p.y + 0.012 - lineY(p.x));
  return max(dark, fill(line - 0.002, 0.002) * 0.4);
}

// The bath's surface over the middle tray: rocked gently all the time,
// and swept by a wave when the sheet changes.
float bathHeight(vec2 b) {
  float t = uTime;
  vec2 c = b - uTray.xy;
  float h = 0.0018 * sin(c.x * 34.0 + t * 1.4) * cos(c.y * 23.0 - t * 1.1);
  h += 0.0012 * sin(c.x * 61.0 - c.y * 41.0 + t * 2.3);
  h += 0.0007 * sin(length(c - vec2(0.05, 0.03)) * 120.0 - t * 3.1);
  float front = mix(-uTray.z - 0.08, uTray.z + 0.18, uWave);
  float behind = front - c.x;
  float wake = exp(-max(behind, 0.0) * 14.0) * step(-0.03, behind);
  float swell = 1.0 - uWave * uWave;
  h += 0.0065 * swell * exp(-pow((c.x - front) / 0.03, 2.0));
  h += 0.003 * swell * wake * sin(behind * 95.0);
  return h;
}

// The density a sheet has come to: the shadows of the picture come up
// first and the highlights last, and the paper stays white where the
// picture is lightest.
float developed(float lum, float t) {
  float d = 1.0 - lum;
  float from = (1.0 - d) * 0.5;
  return d * smoothstep(from, from + 0.5, t) + smoothstep(0.85, 1.0, t) * 0.04;
}

vec3 sheetAt(vec2 b, bool wasSide) {
  if ((wasSide ? uHasWas : uHasNow) < 0.5) return vec3(-1.0);
  vec2 s = (b - uSheet.xy) / uSheet.zw;
  if (abs(s.x) > 1.0 || abs(s.y) > 1.0) return vec3(-1.0);
  vec2 v = s / (1.0 - SHEET_BORDER);
  float inPicture = step(abs(v.x), 1.0) * step(abs(v.y), 1.0);
  vec2 uv;
  float lum;
  float t;
  if (wasSide) {
    uv = 0.5 + vec2(v.x, -v.y) * 0.5 * uWasFit;
    lum = luma(pow(texture(uWas, uv).rgb, vec3(2.2)));
    t = uWasDevelop;
  } else {
    uv = 0.5 + vec2(v.x, -v.y) * 0.5 * uPortraitFit;
    lum = luma(pow(texture(uPortrait, uv).rgb, vec3(2.2)));
    t = uDevelop;
  }
  // A print's tones are pulled into the paper's range.
  lum = pow(clamp(lum, 0.0, 1.0), 0.8);
  float dense = developed(lum, t) * inPicture;
  return PAPER * (1.0 - dense * 0.94);
}

// The trays: slabs on the bench. A ray from the camera, as far as the
// bench at depth 1, is tested against each; the nearest wins.
struct TrayHit {
  float t;
  // 0 the top, 1 a side facing the camera, 2 a side facing x.
  int face;
  int which;
  vec3 at;
};

TrayHit trays(vec3 dir) {
  TrayHit best;
  best.t = 1.0;
  best.face = -1;
  for (int k = -1; k <= 1; k++) {
    vec2 c = uTray.xy + vec2(float(k) * (uTray.z * 2.0 + GAP), 0.0);
    vec3 lo = vec3(c.x - uTray.z, -1.0, c.y - uTray.w);
    vec3 hi = vec3(c.x + uTray.z, -1.0 + TRAY_H, c.y + uTray.w);
    vec3 inv = 1.0 / dir;
    vec3 t0 = lo * inv;
    vec3 t1 = hi * inv;
    vec3 tn = min(t0, t1);
    vec3 tf = max(t0, t1);
    float enter = max(max(tn.x, tn.y), tn.z);
    float leave = min(min(tf.x, tf.y), tf.z);
    if (enter < leave && enter > 0.0 && enter < best.t) {
      best.t = enter;
      best.which = k;
      best.face = enter == tn.y ? 0 : enter == tn.z ? 1 : 2;
      best.at = dir * enter;
    }
  }
  return best;
}

// What the bath reflects: the room is dark, but for the lamp.
vec3 reflection(vec3 at, vec3 r) {
  vec3 lamp = lampAt();
  if (r.z <= 0.0) return vec3(0.0);
  float t = (lamp.z - at.z) / r.z;
  vec3 hit = at + r * t;
  vec2 size = uLamp.zw * lamp.z / uLens.x;
  float on = box(hit.xy - lamp.xy, size - 0.004, 0.006);
  vec3 col = AMBER * 4.5 * fill(on, 0.004);
  // The lit wall round it.
  col += AMBER * 0.05 * exp(-max(on, 0.0) * 9.0);
  return col * uLit;
}

vec3 trayPlastic(vec3 at, vec3 n, float shade) {
  vec3 base = vec3(0.4, 0.385, 0.36) * shade;
  vec3 col = base * (safelight(at, n) + AMBER * 0.012 * uLit);
  vec3 v = normalize(-at);
  vec3 l = normalize(lampAt() - at);
  float spec = pow(max(dot(n, normalize(v + l)), 0.0), 40.0);
  return col + AMBER * spec * 0.4 * uLit;
}

vec3 bench(vec3 at) {
  vec2 b = at.xz;
  float grain = fbm(vec2(b.x * 3.0, b.y * 60.0)) * 0.5 + 0.5 * noise(b * vec2(9.0, 180.0));
  vec3 base = vec3(0.05 + 0.025 * grain);
  vec3 n = vec3(0.0, 1.0, 0.0);
  vec3 col = base * safelight(at, n);
  // Wet patches on the bench catch the lamp.
  float wet = smoothstep(0.55, 0.75, fbm(b * 7.0 + 3.1));
  vec3 v = normalize(-at);
  vec3 l = normalize(lampAt() - at);
  float spec = pow(max(dot(n, normalize(v + l)), 0.0), mix(18.0, 160.0, wet));
  col += AMBER * spec * mix(0.04, 0.6, wet) * uLit;
  return col;
}

vec3 tray(TrayHit hit, vec3 dir) {
  vec2 c = uTray.xy + vec2(float(hit.which) * (uTray.z * 2.0 + GAP), 0.0);
  // The sides get no light from the lamp but what the bench throws back.
  vec3 bounce = AMBER * 0.006 * uLit;
  if (hit.face == 1) {
    float up = (hit.at.y + 1.0) / TRAY_H;
    return trayPlastic(hit.at, vec3(0.0, 0.0, -1.0), 0.55) + bounce * (0.4 + up);
  }
  if (hit.face == 2) {
    float side = sign(hit.at.x - c.x);
    return trayPlastic(hit.at, vec3(side, 0.0, 0.0), 0.45) + bounce * 0.6;
  }
  // On the top: the rim, or the opening.
  vec2 local = hit.at.xz - c;
  float inner = box(local, uTray.zw - RIM, 0.012);
  if (inner > 0.0) {
    float edge = smoothstep(0.0, 0.004, inner);
    return trayPlastic(hit.at, vec3(0.0, 1.0, 0.0), 0.9 - 0.25 * (1.0 - edge));
  }
  // Inside: down to the bath, unless an inner wall comes first.
  vec3 surf = dir * (1.0 - BATH);
  vec2 sl = surf.xz - c;
  if (box(sl, uTray.zw - RIM, 0.012) > 0.0) {
    // The far wall of the tray, inside, lit from above.
    return trayPlastic(surf, vec3(0.0, 0.0, -1.0), 0.5) * 0.8;
  }
  // The bath: a surface that bends what is under it and reflects the lamp.
  vec2 b = surf.xz;
  float e = 0.004;
  float h0 = hit.which == 0 ? bathHeight(b) : 0.0012 * sin(b.x * 40.0 + uTime) * cos(b.y * 30.0 - uTime * 0.8);
  float hx = hit.which == 0 ? bathHeight(b + vec2(e, 0.0)) : h0;
  float hz = hit.which == 0 ? bathHeight(b + vec2(0.0, e)) : h0;
  vec3 n = normalize(vec3(-(hx - h0) / e, 1.0, -(hz - h0) / e));
  vec3 v = normalize(dir);
  vec2 bent = b + n.xz * 0.02;
  vec3 below;
  vec3 bottom = vec3(bent.x, -1.0, bent.y);
  vec3 sheet = vec3(-1.0);
  if (hit.which == 0) {
    float front = mix(-uTray.z - 0.08, uTray.z + 0.18, uWave) + uTray.x;
    sheet = sheetAt(bent, bent.x > front);
  }
  vec3 up = vec3(0.0, 1.0, 0.0);
  if (sheet.x >= 0.0) {
    below = sheet * safelight(bottom, up);
  } else {
    float ribs = 0.85 + 0.15 * smoothstep(0.2, 0.8, abs(fract((bent.x - c.x) * 40.0) - 0.5) * 2.0);
    below = vec3(0.5, 0.48, 0.45) * ribs * safelight(bottom, up);
  }
  // The bath takes a little of what passes through it.
  below *= vec3(0.9, 0.86, 0.78);
  float fresnel = 0.03 + 0.5 * pow(1.0 - max(dot(-v, n), 0.0), 5.0);
  vec3 col = mix(below, reflection(surf, reflect(v, n)), fresnel);
  // Light gathered by the ripples onto the bottom.
  col *= 1.0 + 2.5 * (abs(n.x) + abs(n.z)) * float(hit.which == 0);
  return col;
}

void main() {
  vec2 p = (vUv - 0.5) * vec2(aspectOf(), 1.0);
  float f = uLens.x;
  float back = uLens.y - f / uLens.z;
  vec3 col;

  if (p.y > back) {
    col = wall(p) * (1.0 - wallShadow(p));
    // The wall darkens toward the bench, where the light runs across it.
    col *= 0.75 + 0.25 * smoothstep(back, back + 0.06, p.y);
  } else {
    // Under the line where the wall meets the bench: the bench and the
    // trays, by a ray from the camera.
    float z = f / (uLens.y - p.y);
    vec3 dir = vec3(p.x * z / f, -1.0, z);
    TrayHit hit = trays(dir);
    col = hit.face >= 0 ? tray(hit, dir) : bench(dir);
    // A soft line of dark where the bench meets the wall.
    col *= 0.6 + 0.4 * smoothstep(0.0, 0.03, back - p.y);
  }

  // The haze round the lamp.
  vec2 lq = (p - uLamp.xy) / vec2(uLamp.z * 2.2, uLamp.w * 3.0);
  col += AMBER * 0.06 * exp(-dot(lq, lq) * 0.35) * uLit;

  // The line, its pegs, and the prints that are whole.
  float line = abs(p.y - lineY(p.x));
  float aa = 1.2 / uRes.y;
  float wire = fill(line - 0.0011, aa * 0.5);
  vec3 wireCol = vec3(0.02) + AMBER * 0.25 * uLit * fill(line - 0.0002, 0.0006);
  col = mix(col, wireCol, wire);

  int middle = nearestPrint(p.x);
  for (int k = -1; k <= 1; k++) {
    int i = middle + k;
    if (i < 0 || float(i) >= uCount) continue;
    float x = printX(i);
    if (abs(p.x - x) > uPrint.x + uRow.w + 0.04) continue;
    Hang h = hang(p, x, sway(i));
    float inspect = i == int(floor(uInspect.x + 0.5)) ? uInspect.y : 0.0;
    float form = uForm[i];
    if (form > 0.0 && h.paper > 0.0) {
      // Only the grains already home are drawn here, whole and sharp; the
      // rest are still dust, drawn in the next pass.
      vec2 local = h.q / (uPrint + uRow.w);
      vec2 cell = floor(vec2(
        (local.x * 0.5 + 0.5) * uCells.x,
        (0.5 - local.y * 0.5) * uCells.y
      ));
      cell = clamp(cell, vec2(0.0), uCells - 1.0);
      if (form >= 0.999 || homing(i, cell, form, x) >= 1.0) {
        vec3 rgb = atlasAt(i, h.uv, 0.0);
        col = mix(col, shadePrint(h, rgb, inspect, p), h.paper);
      }
    }
    col = mix(col, shadePeg(h, inspect, p), h.peg);
  }

  // The lamp, on top of everything at its height.
  float lampCover;
  vec3 glass = lampGlass(p, lampCover);
  col = mix(col, glass, lampCover);

  outColor = vec4(max(col, 0.0), 1.0);
}`;

// One grain of dust for every cell of every print's paper. A grain waits in
// the air off to one side of its place, drifting, and is drawn to its place
// as its print comes together, each grain in its own time; it is a round
// mote while it drifts and a square of the picture once it has settled.
export const DUST_VERTEX = `#version 300 es
precision highp float;
${SHARED}
out vec2 vLocal;
out vec3 vLight;
out float vAlpha;
out float vSettled;
out float vSpark;
flat out int vPrint;

void main() {
  int cells = int(uCells.x * uCells.y);
  int i = gl_VertexID / cells;
  int c = gl_VertexID - i * cells;
  vPrint = i;
  float form = uForm[i];
  if (form <= 0.0 || form >= 0.999) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    gl_PointSize = 0.0;
    return;
  }
  int across = int(uCells.x);
  float cx = float(c - (c / across) * across);
  float cy = float(c / across);
  vec2 local = vec2(
    (cx + 0.5) / uCells.x * 2.0 - 1.0,
    1.0 - (cy + 0.5) / uCells.y * 2.0
  );
  vLocal = local;

  vec2 paper = uPrint + uRow.w;
  float x = printX(i);
  vec2 pin = vec2(x, lineY(x) - 0.004);
  float a = sway(i);
  vec2 q = vec2(local.x * paper.x, -paper.y - 0.003 + local.y * paper.y);
  vec2 home = pin + vec2(cos(a) * q.x - sin(a) * q.y, sin(a) * q.x + cos(a) * q.y);

  float id = float(gl_VertexID);
  float h1 = rand(id);
  float h2 = rand(id + 17.0);
  float h3 = rand(id + 41.0);
  float h4 = rand(id + 73.0);
  float k = homing(i, vec2(cx, cy), form, x);
  // Home, the grain is part of the whole print the room draws.
  if (k >= 1.0) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    gl_PointSize = 0.0;
    return;
  }
  float settled = 1.0 - pow(1.0 - k, 3.0);
  // Off to the side the print comes from or goes to, and drifting.
  float side = x > 0.0 ? 1.0 : -1.0;
  vec2 scatter = vec2(side * (0.25 + 1.4 * h2), (h3 - 0.5) * 1.3) * uRow.x;
  float turn = uTime * (0.25 + 0.5 * h4) + h1 * 6.2832;
  vec2 drift = vec2(cos(turn), sin(turn * 1.3)) * uRow.x * 0.14;
  vec2 at = home + (scatter + drift) * (1.0 - settled);

  gl_Position = vec4(at.x / (aspectOf() * 0.5), at.y / 0.5, 0.0, 1.0);
  // In flight a grain is a mote smaller than its cell, growing as it
  // nears home.
  float cell = paper.x * 2.0 / uCells.x * uRes.y;
  gl_PointSize = max(1.0, cell * mix(0.35, 1.1, settled));
  vAlpha = mix(0.4, 1.0, settled) * smoothstep(0.0, 0.12, form);
  vSettled = settled;
  vSpark = h4;
  vLight = printLight(at);
}`;

export const DUST_FRAGMENT = `#version 300 es
precision highp float;
${SHARED}

in vec2 vLocal;
in vec3 vLight;
in float vAlpha;
in float vSettled;
in float vSpark;
flat in int vPrint;
out vec4 outColor;

void main() {
  vec2 pc = gl_PointCoord - 0.5;
  float r2 = dot(pc, pc);
  if (r2 > 0.25) discard;
  float edge = 1.0 - smoothstep(0.12, 0.25, r2);
  vec2 paper = uPrint + uRow.w;
  vec2 q = vLocal * paper;
  vec3 albedo = PAPER;
  if (abs(q.x) < uPrint.x && abs(q.y) < uPrint.y) {
    vec2 uv = 0.5 + vec2(q.x / uPrint.x, -q.y / uPrint.y) * 0.5;
    albedo = underSafelight(atlasAt(vPrint, uv, 2.5));
  }
  vec3 col = albedo * vLight;
  // A mote catches the lamp, some brighter than others, and a grain
  // flares for a moment as it lands.
  vec3 mote = AMBER * (0.25 + 0.9 * vSpark * vSpark) * uLit;
  col = mix(mote, col, smoothstep(0.3, 0.85, vSettled));
  float land = exp(-pow((vSettled - 0.9) / 0.05, 2.0));
  col += vec3(1.0, 0.55, 0.2) * land * (0.6 + 1.6 * vSpark) * uLit;
  float alpha = vAlpha * edge;
  outColor = vec4(col * alpha, alpha);
}`;
