// One full-screen pass draws the whole opening: the film seen through the
// letters of the word, then the same film as a screen in a dark room, its
// light thrown onto the walls and the floor, and the pane of reeded glass that
// carries one film into the next.

export const OPENING_FRAGMENT = `#version 300 es
precision highp float;

in vec2 vUv;
out vec4 outColor;

uniform vec2 uRes;
uniform float uTime;
uniform vec2 uPointer;
uniform float uVelocity;

uniform sampler2D uWord;
uniform vec4 uWordBox;
uniform float uEdges[8];
uniform float uRise[7];
uniform float uParallax;
uniform vec2 uFocal;
uniform vec2 uFocalTo;
uniform float uShift;
uniform float uZoom;

uniform vec4 uFrame;
uniform float uRadius;
uniform float uReeds;

uniform sampler2D uImgA;
uniform sampler2D uImgB;
uniform vec2 uSizeA;
uniform vec2 uSizeB;
uniform vec2 uLight;
uniform float uMix;
uniform float uImgZoom;

uniform float uMode;
uniform float uFlood;
uniform float uRoom;
uniform float uExposure;
uniform float uGrain;

const vec3 UNLIT = vec3(0.075, 0.072, 0.07);
const float PI = 3.14159265;

float hash(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * 0.1031);
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}

float inside01(vec2 uv) {
  return step(0.0, uv.x) * step(uv.x, 1.0) * step(0.0, uv.y) * step(uv.y, 1.0);
}

// Cuts a soft glyph field at its midpoint, one pixel wide at any scale.
float cut(float field) {
  float w = max(fwidth(field) * 0.7, 1e-4);
  return smoothstep(0.5 - w, 0.5 + w, field);
}

float wordField(vec2 px) {
  vec2 focal = mix(uFocal, uFocalTo, uShift);
  vec2 w = uFocal + (px - focal) / uZoom;
  vec2 uv = (w - uWordBox.xy) / uWordBox.zw;

  float rise = 1.0;
  float depth = 0.0;
  for (int i = 0; i < 7; i++) {
    float here = step(uEdges[i], uv.x) * step(uv.x, uEdges[i + 1]);
    rise = mix(rise, uRise[i], here);
    depth = mix(depth, float(i), here);
  }
  float layer = 0.35 + 0.65 * fract(sin(depth * 12.9898 + 4.1) * 43758.5453);
  uv -= uPointer * uParallax * layer / uWordBox.zw;
  uv.y += 1.0 - rise;
  return textureLod(uWord, clamp(uv, 0.0, 1.0), 0.0).a * inside01(uv);
}

float roundedBox(vec2 p, vec2 half_, float r) {
  vec2 q = abs(p) - half_ + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

// Screen uv to picture uv, the picture covering the frame.
vec2 cover(vec2 su, vec2 size, float zoom) {
  float frame = uFrame.z / uFrame.w;
  float image = size.x / size.y;
  vec2 s = frame > image ? vec2(1.0, image / frame) : vec2(frame / image, 1.0);
  return (su - 0.5) * s / zoom + 0.5;
}

vec3 picture(sampler2D img, vec2 size, float light, vec2 su, float zoom, float bias, float spread) {
  vec2 uv = cover(su, size, zoom);
  vec2 shift = vec2(spread, 0.0);
  vec3 c = vec3(
    texture(img, uv - shift, bias).r,
    texture(img, uv, bias).g,
    texture(img, uv + shift, bias).b
  );
  return mix(UNLIT, c, light);
}

vec3 glow(sampler2D img, vec2 size, float light, vec2 su, float lod, float radius) {
  vec2 uv = cover(su, size, 1.0);
  vec3 sum = vec3(0.0);
  for (int i = 0; i < 8; i++) {
    float angle = float(i) * 2.39996 + 0.6;
    float r = sqrt((float(i) + 0.5) / 8.0) * radius;
    sum += textureLod(img, clamp(uv + vec2(cos(angle), sin(angle)) * r, 0.0, 1.0), lod).rgb;
  }
  return mix(UNLIT, sum / 8.0, light);
}

// The film on the screen. Between two films a pane of reeded glass slides
// over it: every reed magnifies its own sliver and bends it, the colours part
// a little at the ridges, and the next film comes through reed by reed as the
// pane moves on and flattens out.
vec3 screenImage(vec2 su) {
  vec2 drift = uPointer * vec2(-0.006, -0.004);
  float aberration = uVelocity * 0.004;
  if (uMix <= 0.0) {
    return picture(uImgA, uSizeA, uLight.x, su + drift, uImgZoom, 0.0, aberration);
  }

  float glass = pow(sin(PI * uMix), 0.9);
  float x = su.x * uReeds;
  float reed = floor(x);
  float local = fract(x) - 0.5;
  float order = reed / max(uReeds - 1.0, 1.0);
  float phase = clamp((uMix - order * 0.4) / 0.6, 0.0, 1.0);
  float swap = smoothstep(0.32, 0.68, phase);

  float bend = -local * glass * 0.6 / uReeds;
  float sag = local * local * glass * 0.012;
  float spread = glass * 0.0016 + aberration;
  float frost = glass * 1.1;

  vec2 a = su + drift + vec2(bend + phase * glass * 0.03, sag);
  vec2 b = su + drift + vec2(bend - (1.0 - phase) * glass * 0.03, sag);
  vec3 ca = picture(uImgA, uSizeA, uLight.x, a, uImgZoom * (1.0 + 0.05 * uMix), frost, spread);
  vec3 cb = picture(uImgB, uSizeB, uLight.y, b, uImgZoom * (1.05 - 0.05 * uMix), frost, spread);
  vec3 c = mix(ca, cb, swap);

  float ridge = smoothstep(0.22, 0.5, local);
  float trough = smoothstep(-0.22, -0.5, local);
  float sheen = pow(1.0 - abs(local + 0.18) * 2.0, 10.0);
  return c * (1.0 + glass * (0.06 * ridge - 0.12 * trough)) + glass * sheen * 0.035;
}

float luma(vec3 c) {
  return dot(c, vec3(0.2126, 0.7152, 0.0722));
}

void main() {
  vec2 px = vUv * uRes;
  vec2 su = (px - uFrame.xy) / uFrame.zw;
  vec3 film = pow(screenImage(su), vec3(1.03));

  vec3 color;
  if (uMode < 0.5) {
    float word = cut(wordField(px));
    color = film * max(word, uFlood);
  } else {
    vec2 centre = uFrame.xy + uFrame.zw * 0.5;
    float d = roundedBox(px - centre, uFrame.zw * 0.5, uRadius);
    float onScreen = 1.0 - smoothstep(-0.75, 0.75, d);

    vec3 room = vec3(0.0);
    if (uRoom > 0.0) {
      float blend = smoothstep(0.25, 0.75, uMix);
      vec3 spill = glow(uImgA, uSizeA, uLight.x, su, 5.5, 0.12);
      if (uMix > 0.0) spill = mix(spill, glow(uImgB, uSizeB, uLight.y, su, 5.5, 0.12), blend);
      float reach = uRes.y * 0.2;
      float halo = exp(-max(d, 0.0) / reach);
      room += spill * halo * 0.42;

      // The floor: a dim, softening mirror of the screen.
      float below = (px.y - (uFrame.y + uFrame.w)) / uFrame.w;
      if (below > 0.0) {
        vec2 mirror = vec2(su.x, 1.0 - below);
        float lod = 2.0 + below * 9.0;
        vec3 floorA = glow(uImgA, uSizeA, uLight.x, mirror, lod, 0.012);
        if (uMix > 0.0) floorA = mix(floorA, glow(uImgB, uSizeB, uLight.y, mirror, lod, 0.012), blend);
        float edge = smoothstep(-0.02, 0.06, su.x) * smoothstep(1.02, 0.94, su.x);
        room += floorA * exp(-below / 0.2) * 0.2 * edge;
      }
      room *= uRoom;
    }
    color = mix(room, film, onScreen);
  }

  color *= uExposure;

  float grain = hash(floor(px / 1.5) + floor(uTime * 24.0) * 37.13) - 0.5;
  color += grain * uGrain * (0.01 + 0.8 * luma(color));

  outColor = vec4(max(color, 0.0), 1.0);
}`;
