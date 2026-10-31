// The foundry: one full-screen pass draws the room and a gold plate cast
// from a poster. The plate is a real plane (a ray hits it, so a tilt has true
// perspective); its relief is the poster's light, so bright parts stand
// proud and dark parts sink. The room is black: the only light is the lamp
// overhead (its cone shows in the dust) and the molten metal's own glow.
// The opening runs in beats: the lamp comes on (uLamp), a glint runs round
// the gilt frame and leaves it standing (uReveal), molten gold is poured
// into the empty mould and rises to the brim (uFill), the relief sets out of
// it (uMelt), the gold gives way to the print from the top down (uCool),
// and the burin cuts the ceremony's year into the heavier top rail (uCut).
// A change melts the plate, swaps the print under the liquid and casts it
// again.

export const FOUNDRY_FRAGMENT = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;

uniform vec2 uRes;
uniform vec4 uPlate;      // centre (px, y up), half height (px), aspect w/h
uniform vec2 uTilt;       // yaw, pitch (radians)
uniform vec3 uLight;      // key light, plate units
uniform float uTime;
uniform float uMelt;      // 0 solid .. 1 liquid
uniform float uCool;      // 0 gold .. 1 colour
uniform float uHeat;      // how hot a pour still is (1 at a new cast)
uniform float uLamp;      // the overhead lamp, 0 off .. 1 on
uniform float uReveal;    // how far round the frame the glint has run
uniform float uFill;      // how full the mould is
uniform float uCut;       // how far along the rail the year is cut
uniform sampler2D uPoster;
uniform sampler2D uEngrave; // the rail's lettering, white where it is cut

const float BORDER = 0.085;
const float HEAD = 0.075;   // what the top rail adds to the border
const float RAIL = 0.13;    // the lettering's band, centred on the rail
const float CUT = 0.0075;   // how deep the letters go
const float CAMERA = 3.4;
const vec3 GOLD = vec3(0.86, 0.68, 0.40);
const vec3 LUMA = vec3(0.2126, 0.7152, 0.0722);

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

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
    sum += amp * noise(p);
    p = p * 2.03 + 17.1;
    amp *= 0.5;
  }
  return sum;
}

float box(vec2 p, vec2 half_) {
  vec2 d = abs(p) - half_;
  return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
}

mat3 rotation(vec2 tilt) {
  float cy = cos(tilt.x), sy = sin(tilt.x);
  float cx = cos(tilt.y), sx = sin(tilt.y);
  mat3 yaw = mat3(cy, 0.0, -sy, 0.0, 1.0, 0.0, sy, 0.0, cy);
  mat3 pitch = mat3(1.0, 0.0, 0.0, 0.0, cx, sx, 0.0, -sx, cx);
  return yaw * pitch;
}

// Distance to the frame's outline: even on three sides, heavier on top.
float frameAt(vec2 q) {
  float a = uPlate.w;
  return box(q - vec2(0.0, HEAD * 0.5), vec2(a + BORDER, 1.0 + BORDER + HEAD * 0.5)) - 0.02;
}

// Where on the rail's lettering band q is, 0..1 each way.
vec2 railAt(vec2 q) {
  float a = uPlate.w;
  return vec2(q.x / (2.0 * a) + 0.5, (1.0 + (BORDER + HEAD) * 0.5 + RAIL * 0.5 - q.y) / RAIL);
}

// The burin's place along the rail.
float burin() {
  return mix(0.2, 0.8, uCut);
}

float engraveAt(vec2 q) {
  float a = uPlate.w;
  vec2 t = railAt(q);
  if (t.x < 0.0 || t.x > 1.0 || t.y < 0.0 || t.y > 1.0) return 0.0;
  // Sampled in a branch, so the level is picked by hand: mask texels per pixel.
  float lod = log2(float(textureSize(uEngrave, 0).x) / (2.0 * a * uPlate.z));
  float cut = smoothstep(burin() + 0.004, burin() - 0.004, t.x);
  return textureLod(uEngrave, t, max(lod, 0.0)).r * max(cut, step(1.0, uCut));
}

// The level of the pour in the mould, with a slow swell on its surface.
float surfaceAt(vec2 q) {
  return mix(-1.1, 1.1, uFill) + sin(q.x * 9.0 + uTime * 2.2) * 0.006
    + (fbm(vec2(q.x * 4.0, uTime * 0.6)) - 0.5) * 0.02;
}

vec2 posterUv(vec2 q) {
  float a = uPlate.w;
  return vec2(q.x / a * 0.5 + 0.5, 0.5 - q.y * 0.5);
}

// How molten this spot is: heat pools low and spreads in licks.
float meltAt(vec2 q) {
  float n = fbm(q * 2.2 + vec2(0.0, uTime * 0.08));
  return clamp(uMelt * 2.1 - 0.55 + (n - 0.5) * 0.7 - q.y * 0.18, 0.0, 1.0);
}

float lightOf(vec2 uv, float lod) {
  return dot(textureLod(uPoster, uv, lod).rgb, LUMA);
}

// Height in plate units: a bevelled frame, a recessed field, the relief.
float heightAt(vec2 q, float melt) {
  float a = uPlate.w;
  float outer = frameAt(q);
  float inner = box(q, vec2(a, 1.0));
  float frame = smoothstep(0.0, -BORDER * 0.7, outer) * 0.03;
  frame += exp(-pow(inner / 0.012, 2.0)) * 0.012;
  // The letters melt with the pour and are cut again when it sets.
  if (inner > 0.0) return frame - engraveAt(q) * CUT * (1.0 - uMelt);
  vec2 uv = posterUv(q);
  float broad = lightOf(uv, 3.2);
  float fine = lightOf(uv, 1.2);
  float relief = (broad * 0.5 + fine * 0.5) * 0.03 * (1.0 - melt);
  float ripple = (fbm(q * 7.0 + vec2(uTime * 0.6, -uTime * 0.4)) - 0.5) * 0.006 * melt;
  return frame + 0.006 + relief + ripple;
}

// A studio around the plate: two softboxes overhead, a warm low horizon.
vec3 studio(vec3 r, float rough) {
  float spread = mix(0.05, 0.35, rough);
  float top = smoothstep(0.62 - spread, 0.78, r.y) * smoothstep(1.02 + spread, 0.86, r.y);
  top *= smoothstep(0.9 + spread, 0.2, abs(r.x + 0.25));
  float side = smoothstep(0.55 - spread, 0.8, -r.x) * smoothstep(0.75 + spread, 0.1, abs(r.y - 0.1));
  float horizon = exp(-abs(r.y + 0.08) * 5.0);
  vec3 env = vec3(0.01, 0.008, 0.007);
  env += vec3(1.0, 0.95, 0.9) * top * 1.1;
  env += vec3(0.85, 0.9, 1.0) * side * 0.45;
  env += vec3(0.8, 0.55, 0.32) * horizon * 0.12;
  return env;
}

vec3 blackbody(float t) {
  vec3 ember = vec3(0.9, 0.12, 0.015);
  vec3 orange = vec3(1.9, 0.62, 0.1);
  vec3 white = vec3(2.8, 2.0, 1.1);
  vec3 c = mix(ember, orange, smoothstep(0.0, 0.65, t));
  c = mix(c, white, smoothstep(0.75, 1.0, t));
  return c * smoothstep(0.0, 0.3, t);
}

float ggx(float nh, float rough) {
  float a = rough * rough;
  float a2 = a * a;
  float d = nh * nh * (a2 - 1.0) + 1.0;
  return a2 / (3.14159 * d * d + 1e-5);
}

void main() {
  vec2 frag = gl_FragCoord.xy;
  vec2 p = (frag - uPlate.xy) / uPlate.z;
  mat3 rot = rotation(uTilt);
  vec3 eye = vec3(0.0, 0.0, CAMERA);
  vec3 dir = normalize(vec3(p, -CAMERA));
  vec3 normal = rot * vec3(0.0, 0.0, 1.0);
  float t = -dot(eye, normal) / dot(dir, normal);
  vec3 hit = eye + dir * t;
  vec2 q = (transpose(rot) * hit).xy;

  float a = uPlate.w;
  float px = 1.5 / uPlate.z;
  float outer = frameAt(q);

  // The room is black. The lamp's cone shows faintly in the air and in the
  // dust that drifts through it; the molten metal throws its own glow.
  vec2 s = (frag - vec2(uPlate.x, uRes.y)) / uRes.y;
  float width = 0.1 + 0.24 * clamp(-s.y, 0.0, 1.4);
  float shaft = exp(-pow(s.x / width, 2.0)) * smoothstep(-1.5, -0.05, s.y) * uLamp;
  vec3 room = vec3(1.0, 0.82, 0.62) * shaft * 0.01;
  vec2 cell = floor(frag / 46.0);
  vec2 mote = cell + vec2(hash(cell), hash(cell + 7.0));
  vec2 drift = vec2(sin(uTime * 0.13 + hash(cell) * 6.28), uTime * 0.09) * 9.0;
  float speck = smoothstep(2.2, 0.0, length(frag - (mote * 46.0 + drift)));
  room += vec3(1.0, 0.85, 0.6) * speck * shaft * step(0.9, hash(cell + 3.1)) * 0.22;
  float near = exp(-max(outer, 0.0) * 2.4);
  float molten = uMelt * smoothstep(0.0, 0.25, uFill);
  room += vec3(2.0, 0.55, 0.08) * near * near * molten * 0.06;

  // The frame stands as the glint runs round it, from the top both ways;
  // the mould inside comes out of the dark once the frame is whole.
  float inner = box(q, vec2(a, 1.0));
  float field = 1.0 - smoothstep(-px, px, inner);
  float around = abs(atan(q.x, q.y)) / 3.14159;
  float front = uReveal * 1.1;
  float standing = mix(smoothstep(front, front - 0.05, around), smoothstep(0.75, 1.0, uReveal), field);

  if (outer > px || standing <= 0.0) {
    outColor = vec4(room, 1.0);
    return;
  }

  // Only what is in the mould melts; the frame stays solid gilt.
  float melt = meltAt(q) * smoothstep(0.0, -0.02, inner);
  float e = 0.0016;
  float h = heightAt(q, melt);
  float hx = heightAt(q + vec2(e, 0.0), melt) - heightAt(q - vec2(e, 0.0), melt);
  float hy = heightAt(q + vec2(0.0, e), melt) - heightAt(q - vec2(0.0, e), melt);
  vec3 n = normalize(vec3(-hx / (2.0 * e), -hy / (2.0 * e), 1.0));
  vec3 point = vec3(q, h);
  vec3 view = normalize(transpose(rot) * (eye - hit));
  vec3 toLight = uLight - point;
  float falloff = 1.0 / (1.0 + dot(toLight, toLight) * 0.05);
  vec3 l = normalize(toLight);
  vec3 hv = normalize(l + view);
  float nl = max(dot(n, l), 0.0);
  float nv = max(dot(n, view), 1e-3);
  float nh = max(dot(n, hv), 0.0);

  vec2 uv = posterUv(q);
  vec3 print = textureLod(uPoster, uv, 0.0).rgb;
  float lit = dot(print, LUMA);

  // Bright parts stand polished, dark parts sink into darker, rougher patina.
  float brushed = noise(vec2(q.x * 900.0, q.y * 6.0)) * 0.08;
  float rough = mix(0.5, 0.26, lit * field) + brushed;
  rough = mix(rough, 0.07, melt);
  vec3 albedo = GOLD * mix(1.0, mix(0.3, 1.08, smoothstep(0.02, 0.85, lit)), field);
  albedo = mix(albedo, GOLD * 0.9, melt);
  vec3 f0 = albedo;
  vec3 fresnel = f0 + (1.0 - f0) * pow(1.0 - max(dot(hv, view), 0.0), 5.0);
  float k = (rough + 1.0) * (rough + 1.0) / 8.0;
  float geometry = nl / (nl * (1.0 - k) + k) * nv / (nv * (1.0 - k) + k);
  vec3 spec = ggx(nh, rough) * fresnel * geometry / (4.0 * nl * nv + 1e-4);
  vec3 key = min(spec * nl, vec3(2.5)) * vec3(1.0, 0.95, 0.88) * 0.9 * falloff;

  vec3 r = rot * reflect(-view, n);
  vec3 envF = f0 + (max(vec3(1.0 - rough), f0) - f0) * pow(1.0 - nv, 5.0);
  // Grime settles in the cut letters, so they read dark against the gilt.
  float cut = engraveAt(q) * (1.0 - field) * (1.0 - uMelt);
  float cavity = mix(0.45, 1.0, smoothstep(0.0, 0.8, lit)) * field + (1.0 - field) * (1.0 - cut * 0.6);
  vec3 gold = (studio(r, rough) * envF * cavity + key) * 0.8;

  // Heat: liquid glows from within, then a fresh cast cools to gold.
  float glow = max(melt, uHeat * (1.0 - smoothstep(0.0, 0.9, lit + 0.25 * fbm(q * 3.0)))
    * smoothstep(-0.25, 0.2, q.y - mix(1.2, -1.3, uHeat)));
  // Molten gold glows from within, yellow where it runs hottest and deep
  // orange where it cools, in slow soft currents; the lamp still glints on
  // its swell. As a fresh cast cools the glow goes out from the top down.
  vec2 flow = vec2(uTime * 0.05, -uTime * 0.11);
  float current = fbm(q * 2.6 + flow + fbm(q * 1.3 - flow) * 1.4);
  vec3 hot = mix(vec3(0.85, 0.32, 0.06), vec3(1.25, 0.8, 0.32), smoothstep(0.3, 0.75, current));
  hot *= 0.3 + 0.22 * current;
  vec3 color = mix(gold, hot + gold * 0.55, glow * field);
  // The cast sets from the top down, one clean front across the print: the
  // print, varnished, with the raking lamp glinting only where its relief
  // rises, and a thin line of gilt riding the front.
  float sweep = uCool * 2.5 - (1.0 - q.y) - q.x * 0.12 - (fbm(q * 3.0) - 0.5) * 0.08;
  float cool = smoothstep(0.0, 0.35, sweep) * field * (1.0 - melt);
  vec3 paint = pow(print, vec3(2.2));
  float soft = max(dot(n, normalize(vec3(-0.25, 0.35, 1.0))), 0.0);
  vec3 varnish = ggx(nh, 0.3) * nl * 0.05 * vec3(1.0, 0.97, 0.92) * falloff;
  vec3 shown = paint * (0.62 + 0.3 * soft) + min(varnish, vec3(0.25));
  float rim = exp(-pow((sweep - 0.04) / 0.035, 2.0)) * (1.0 - uCool) * (1.0 - melt);
  color = mix(color, shown, cool) + GOLD * rim * 0.18 * field;

  // Until the pour reaches it, the mould is empty: a dark recess that only
  // its walls' bevel catches the lamp in. The pour's surface runs hot, and
  // a thin stream falls into the mould from the top rail while it fills.
  float level = surfaceAt(q);
  float pouring = step(0.0001, uFill) * (1.0 - step(1.0, uFill));
  float filled = max(smoothstep(level + px * 2.0, level - px * 2.0, q.y), step(1.0, uFill));
  vec3 empty = studio(r, 0.55) * GOLD * 0.035 * uLamp * smoothstep(0.75, 1.0, uReveal);
  color = mix(mix(empty, color, filled), color, 1.0 - field);
  color += blackbody(0.9) * exp(-pow((q.y - level) / 0.01, 2.0)) * field * pouring * 0.35;
  float wobble = sin(q.y * 7.0 + uTime * 3.0) * 0.006 * (1.0 - q.y);
  float stream = smoothstep(0.018, 0.006, abs(q.x - wobble)) * step(level, q.y) * field;
  stream *= pouring * smoothstep(1.0, 0.9, uFill);
  color = mix(color, blackbody(0.82) * 0.7 + GOLD * 0.2, stream);

  // The glint that raises the frame, and the burin's spark on the rail.
  float glint = exp(-pow((around - front) / 0.02, 2.0)) * (1.0 - field) * (1.0 - smoothstep(0.85, 1.0, uReveal));
  color += vec3(1.0, 0.88, 0.66) * glint * 1.6;
  vec2 rail = railAt(q);
  float spark = exp(-pow((rail.x - burin()) / 0.004, 2.0)) * exp(-pow((rail.y - 0.5) / 0.35, 2.0));
  color += vec3(1.0, 0.86, 0.6) * spark * step(0.0001, uCut) * (1.0 - step(1.0, uCut)) * (1.0 - field) * 1.4;

  float cover = smoothstep(px, -px, outer) * standing;
  color *= mix(1.0, standing, field);
  float edge = smoothstep(-0.03, 0.0, outer);
  color += GOLD * edge * 0.03 * uLamp;
  outColor = vec4(mix(room, color, cover), 1.0);
}`;
