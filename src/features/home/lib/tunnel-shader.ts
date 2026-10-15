// The tunnel is drawn the way a set is lit. The corridor is traced per pixel:
// matte plaster walls, a polished concrete floor with the calendar painted on
// it, and a threshold of light that is today. Nothing in it glows of its own
// accord; the posters are lightboxes, and the colour on the walls and the
// floor is the colour of the films nearest to it. The posters are then drawn
// as quads through the same camera, once mirrored in the floor and once
// standing, and the whole frame is developed at the end: bloom, a soft
// shoulder for the highlights, a little fringing at the edges and grain.
// Light is linear throughout and only becomes sRGB in the last pass.

export const MAX_LIGHTS = 16;

const COMMON = `
float hash(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * 0.1031);
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
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

float roundedBox(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

const float FOG = 0.11;
const vec3 THRESHOLD = vec3(1.0, 0.95, 0.88);
`;

// The floor paint is held in strips, one layer of an array each, so it can be
// sharp right under the camera. Its gradients are taken across the whole
// floor, so the seams between strips never pick a coarser level.
const FLOOR = `
uniform highp sampler2DArray uFloor;
uniform vec2 uFloorSpan;
// Strips the paint fills, and layers allocated.
uniform vec2 uFloorStrips;
uniform float uFloorReady;

float floorPaint(vec3 p, float halfWidth) {
  vec2 uv = vec2(
    (p.x + halfWidth) / (2.0 * halfWidth),
    (uFloorSpan.x - p.z) / (uFloorSpan.x - uFloorSpan.y)
  );
  vec2 g = vec2(uv.x, uv.y * uFloorStrips.x);
  vec2 dx = dFdx(g);
  vec2 dy = dFdy(g);
  if (uFloorReady < 0.5 || uv.y < 0.0 || uv.y > 1.0) return 0.0;
  float layer = clamp(floor(g.y), 0.0, uFloorStrips.y - 1.0);
  return textureGrad(uFloor, vec3(g.x, g.y - layer, layer), dx, dy).r;
}
`;

export const ROOM_FRAGMENT = `#version 300 es
precision highp float;

in vec2 vUv;
out vec4 outColor;

uniform vec3 uCam;
uniform vec3 uRight;
uniform vec3 uUp;
uniform vec3 uBack;
uniform float uTanH;
uniform float uAspect;
// Half width, floor, ceiling.
uniform vec3 uBox;
uniform float uGate;
uniform float uGatePower;
uniform float uPortal;
// The canon as it would be seen on this screen, small, and the colour of the
// light it throws.
uniform sampler2D uBeyond;
uniform float uBeyondReady;
uniform vec3 uDoorColour;
uniform float uTime;
uniform int uLights;
uniform vec3 uLightPos[${MAX_LIGHTS}];
uniform vec3 uLightDir[${MAX_LIGHTS}];
uniform vec3 uLightColor[${MAX_LIGHTS}];
${COMMON}
${FLOOR}

// How far a ray goes before it meets the corridor, and what it meets:
// 0 a wall, 1 the floor, 2 the ceiling.
float trace(vec3 o, vec3 d, out int surface) {
  float tx = abs(d.x) > 1e-6 ? ((d.x > 0.0 ? uBox.x : -uBox.x) - o.x) / d.x : 1e9;
  float ty = abs(d.y) > 1e-6 ? ((d.y > 0.0 ? uBox.z : uBox.y) - o.y) / d.y : 1e9;
  if (tx < ty) {
    surface = 0;
    return tx;
  }
  surface = d.y > 0.0 ? 2 : 1;
  return ty;
}

vec3 lightAt(vec3 p, vec3 n) {
  vec3 sum = vec3(0.0);
  for (int i = 0; i < ${MAX_LIGHTS}; i += 1) {
    if (i >= uLights) break;
    vec3 to = uLightPos[i] - p;
    float d2 = dot(to, to);
    vec3 l = to * inversesqrt(d2);
    // Mostly forward, with a little spill round the back of the box.
    float lobe = 0.22 + 0.78 * max(dot(uLightDir[i], -l), 0.0);
    sum += uLightColor[i] * max(dot(n, l), 0.0) * lobe * 1.6 / (d2 + 0.14);
  }
  return sum;
}

// Where a point of the corridor falls on the screen.
vec2 screenOf(vec3 q) {
  vec3 v = q - uCam;
  float z = max(dot(v, -uBack), 1e-3);
  vec2 ndc = vec2(
    dot(v, uRight) / (z * uTanH * uAspect),
    dot(v, uUp) / (z * uTanH)
  );
  return vec2(ndc.x * 0.5 + 0.5, 0.5 - ndc.y * 0.5);
}

// What is seen through the doorway at a point of the screen, linear.
vec3 beyondAt(vec2 uv, float lod) {
  vec3 c = textureLod(uBeyond, clamp(uv, 0.0, 1.0), lod).rgb;
  return pow(c, vec3(2.2)) * uBeyondReady;
}

// The doorway as a lamp: the whole opening glows with the wall behind it,
// so it lights the corridor the way a window lights a room, falling off
// with distance and with the angle it is met at.
const float DOOR_GAIN = 7.0;
vec3 doorwayLight(vec3 p, vec3 n) {
  vec3 centre = vec3(0.0, (uBox.y + uBox.z) * 0.5, uPortal);
  vec3 to = centre - p;
  float d2 = dot(to, to);
  vec3 l = to * inversesqrt(d2);
  float area = 2.0 * uBox.x * (uBox.z - uBox.y);
  float form = area * max(dot(n, l), 0.0) * max(-l.z, 0.0) / (3.14159 * d2 + area);
  return uDoorColour * form * DOOR_GAIN * uBeyondReady;
}

void main() {
  vec2 ndc = vec2(vUv.x * 2.0 - 1.0, 1.0 - vUv.y * 2.0);
  vec3 dir = normalize(uRight * ndc.x * uAspect * uTanH + uUp * ndc.y * uTanH - uBack);

  int surface;
  float t = min(trace(uCam, dir, surface), 90.0);
  vec3 p = uCam + dir * t;

  // Everything that takes a derivative is worked out here, before any pixel
  // of the quad can leave early: a derivative taken after some of its
  // neighbours have gone is undefined, and shows as bright seams.
  float zw = max(fwidth(p.z), 1e-4);
  float floorMark = floorPaint(p, uBox.x);

  // Through the doorway the corridor is gone and the canon hangs there. This
  // canvas is clear in the doorway so the canon's own sharp canvas, drawn
  // behind it, shows through; what it keeps here is only the doorway's light
  // for the bloom to spread round its edges.
  if (dir.z < -1e-4 && p.z < uPortal) {
    float tp = (uPortal - uCam.z) / dir.z;
    vec3 glow = beyondAt(vUv, 1.0) * 1.6 * exp(-tp * FOG * 0.5);
    outColor = vec4(glow, 0.0);
    return;
  }

  vec3 n = surface == 0 ? vec3(-sign(p.x), 0.0, 0.0)
         : surface == 1 ? vec3(0.0, 1.0, 0.0)
         : vec3(0.0, -1.0, 0.0);

  // Seams between the panels, across the walls and the ceiling.
  float seam = abs(fract(p.z / 1.6 + 0.5) - 0.5) * 1.6;
  float panel = 0.55 + 0.45 * smoothstep(0.003, 0.003 + zw * 1.5, seam);

  // A black set: dark plaster, near-black concrete and ceiling, so the
  // lightboxes make the only light there is.
  vec3 albedo;
  float paint = 0.0;
  if (surface == 0) {
    float height = p.y - uBox.y;
    albedo = vec3(0.052, 0.049, 0.046) * panel;
    // A dark skirting with a lit edge along its top.
    albedo *= mix(0.4, 1.0, smoothstep(0.075, 0.08, height));
    albedo += vec3(0.022) * (1.0 - smoothstep(0.0, 0.004 + zw, abs(height - 0.08)));
  } else if (surface == 1) {
    float mottle = noise(p.xz * vec2(2.6, 1.3)) * 0.6 + noise(p.xz * 9.0) * 0.4;
    albedo = vec3(0.026, 0.025, 0.024) * (0.75 + 0.5 * mottle);
    paint = floorMark;
    albedo = mix(albedo, vec3(0.3, 0.29, 0.275), paint);
  } else {
    albedo = vec3(0.016) * panel;
  }

  float beyond = step(p.z, uGate);
  vec3 ambient = mix(vec3(1.0, 0.9, 0.78), vec3(0.76, 0.86, 1.0), beyond) * 0.006;
  float gz = p.z - uGate;
  vec3 light = ambient + lightAt(p, n);
  light += THRESHOLD * uGatePower * 0.9 * exp(-abs(gz) * 1.7);
  light += doorwayLight(p, n);
  vec3 color = albedo * light;
  // How much of the canon's mirrored doorway shows through the floor.
  float gloss = 0.0;

  // Today: a line of light drawn round the inside of the corridor.
  float line = 1.0 - smoothstep(0.007, 0.007 + zw * 1.5, abs(gz));
  color += THRESHOLD * line * 9.0 * uGatePower;

  if (surface == 1) {
    // The paint is glossier than the concrete: it catches the light boxes
    // in a sheen that slides as the camera walks.
    vec3 v = -dir;
    vec3 sheen = vec3(0.0);
    for (int i = 0; i < ${MAX_LIGHTS}; i += 1) {
      if (i >= uLights) break;
      vec3 to = uLightPos[i] - p;
      float d2 = dot(to, to);
      vec3 h = normalize(to * inversesqrt(d2) + v);
      sheen += uLightColor[i] * pow(max(h.y, 0.0), 90.0) / (d2 + 0.3);
    }
    color += sheen * (0.12 + 0.9 * paint);

    // The floor is polished: it holds a soft copy of the threshold.
    vec3 rd = vec3(dir.x, -dir.y, dir.z);
    int bounce;
    float t2 = trace(p + rd * 1e-3, rd, bounce);
    vec3 q = p + rd * t2;
    float rough = 0.01 + t2 * 0.06;
    float fresnel = 0.04 + 0.96 * pow(1.0 - abs(dir.y), 5.0);
    float mirror = exp(-abs(q.z - uGate) / rough) * 0.012 / rough;
    color += THRESHOLD * mirror * fresnel * uGatePower * (1.0 - 0.8 * paint);

    // And the doorway, with the wall in it. The canon draws its own
    // reflection behind this canvas; the floor lets as much of it through
    // as polished concrete would, more at a grazing angle, broken up by the
    // surface, and less over the paint.
    if (rd.z < -1e-4 && p.z > uPortal) {
      float tp = (uPortal - p.z) / rd.z;
      vec3 hit = p + rd * tp;
      float inside = step(abs(hit.x), uBox.x) * step(hit.y, uBox.z);
      float streak = 0.65 + 0.35 * noise(p.xz * vec2(2.4, 0.45));
      gloss = inside * min(0.85, (0.12 + 1.1 * fresnel) * streak) * (1.0 - 0.6 * paint);
    }
  }

  color *= exp(-t * FOG);

  // The air near the doorway holds its light, in beams that follow what is
  // in it: each point of the air is lit by the stretch of wall straight
  // ahead of it, so a bright poster sends a brighter shaft.
  if (uBeyondReady > 0.0) {
    float tEnd = t;
    if (dir.z < -1e-4) tEnd = min(tEnd, (uPortal - uCam.z) / dir.z);
    vec3 centre = vec3(0.0, (uBox.y + uBox.z) * 0.5, uPortal);
    float area = 2.0 * uBox.x * (uBox.z - uBox.y);
    float jitter = hash(gl_FragCoord.xy + fract(uTime * 7.0) * 61.0);
    vec3 air = vec3(0.0);
    const int STEPS = 8;
    for (int i = 0; i < STEPS; i += 1) {
      float ti = tEnd * (float(i) + jitter) / float(STEPS);
      vec3 q = uCam + dir * ti;
      if (q.z < uPortal) break;
      vec3 to = centre - q;
      float d2 = dot(to, to);
      float facing = max(-to.z * inversesqrt(d2), 0.0);
      float form = area * facing / (3.14159 * d2 + area);
      vec3 ahead = vec3(clamp(q.x, -uBox.x, uBox.x), clamp(q.y, uBox.y, uBox.z), uPortal);
      vec3 beam = beyondAt(screenOf(ahead), 2.5);
      air += beam * form * exp(-ti * FOG);
    }
    color += air * (tEnd / float(STEPS)) * 0.3;
  }

  // The air holds a little of the threshold's light: a veil across the
  // corridor, brightest along the frame, that the camera walks through.
  if (dir.z < -1e-4) {
    float tg = (uGate - uCam.z) / dir.z;
    if (tg > 0.0 && tg < t) {
      vec3 h = uCam + dir * tg;
      float edge = min(min(uBox.x - abs(h.x), h.y - uBox.y), uBox.z - h.y);
      float veil = exp(-max(edge, 0.0) * 6.0) * 0.35 + 0.02;
      color += THRESHOLD * veil * uGatePower * exp(-tg * FOG);
    }
  }
  color += THRESHOLD * 0.08 * uGatePower * exp(-abs(uCam.z - uGate) * 3.0);

  outColor = vec4(max(color, 0.0), 1.0 - gloss);
}`;

export const POSTER_VERTEX = `#version 300 es
in vec2 aCorner;

uniform mat4 uViewProj;
uniform vec3 uCenter;
uniform vec2 uSize;
uniform float uYaw;
uniform float uMirror;
uniform float uFloorY;

out vec2 vUv;
out vec3 vWorld;

void main() {
  vec3 right = vec3(cos(uYaw), 0.0, -sin(uYaw));
  vec3 world = uCenter + right * aCorner.x * uSize.x + vec3(0.0, aCorner.y * uSize.y, 0.0);
  if (uMirror > 0.5) world.y = 2.0 * uFloorY - world.y;
  vUv = vec2(aCorner.x + 0.5, 0.5 - aCorner.y);
  vWorld = world;
  gl_Position = uViewProj * vec4(world, 1.0);
}`;

export const POSTER_FRAGMENT = `#version 300 es
precision highp float;

in vec2 vUv;
in vec3 vWorld;
out vec4 outColor;

uniform sampler2D uPrint;
// The part of the print that fills the box: offset and scale.
uniform vec4 uCrop;
uniform vec2 uSize;
uniform vec3 uCam;
uniform float uLoaded;
uniform float uHover;
uniform float uPower;
uniform float uMirror;
uniform float uFloorY;
uniform float uHalf;
${COMMON}
${FLOOR}

// The print blurred the way a polished floor blurs it: more the further the
// reflection falls below the poster, and more down the corridor than across.
vec3 blurred(vec2 uv, float depth) {
  float lod = 1.0 + depth * 3.5;
  vec2 radius = vec2(0.6, 1.6) * (0.004 + depth * 0.05);
  vec3 sum = vec3(0.0);
  for (int i = 0; i < 10; i++) {
    float angle = float(i) * 2.39996 + 0.4;
    float r = sqrt((float(i) + 0.5) / 10.0);
    vec2 at = clamp(uv + vec2(cos(angle), sin(angle)) * r * radius, 0.002, 0.998);
    sum += textureLod(uPrint, uCrop.xy + at * uCrop.zw, lod).rgb;
  }
  return sum / 10.0;
}

void main() {
  vec2 q = (vUv - 0.5) * uSize;
  float d = roundedBox(q, uSize * 0.5, 0.006);
  float w = max(fwidth(d), 1e-5);
  float alpha = 1.0 - smoothstep(-w, w, d);

  // A slim black frame round the print.
  const float FRAME = 0.016;
  vec2 inner = uSize * 0.5 - FRAME;
  float art = 1.0 - smoothstep(-w, w, roundedBox(q, inner, 0.002));
  vec2 uv = clamp(q / (inner * 2.0) + 0.5, 0.002, 0.998);

  float depth = 0.0;
  vec3 print;
  if (uMirror > 0.5) {
    depth = uFloorY - vWorld.y;
    print = blurred(uv, depth);
  } else {
    print = texture(uPrint, uCrop.xy + uv * uCrop.zw).rgb;
  }
  print = pow(print, vec3(2.2));

  // Lit from behind: brightest in the middle of the diffuser.
  float diffuser = 1.04 - 0.22 * dot(vUv - 0.5, vUv - 0.5) * 4.0;
  vec3 face = mix(vec3(0.01), print * 1.18 * diffuser, uLoaded) * uPower;
  face *= 1.0 + 0.32 * uHover;

  vec3 frame = vec3(0.018) + vec3(0.06) * smoothstep(0.004, 0.0, abs(q.y - uSize.y * 0.5 + 0.004)) * uPower;
  vec3 color = mix(frame, face, art);

  // The glass catches the corridor as the camera goes by.
  float slide = (uCam.z - vWorld.z) * 0.18 + vUv.y * 0.42 - vUv.x * 0.24;
  float band = exp(-pow((fract(slide * 0.5) - 0.5) / 0.05, 2.0));
  color += vec3(0.035) * band * art * uLoaded;

  float dist = length(vWorld - uCam);
  color *= exp(-dist * FOG);
  // Close by a poster dissolves as the camera passes, so it never stands in
  // front of the credits.
  alpha *= smoothstep(0.5, 1.4, uCam.z - vWorld.z);

  if (uMirror > 0.5) {
    // The point of the floor this reflection is seen in.
    float k = (uFloorY - uCam.y) / (vWorld.y - uCam.y);
    vec3 f = uCam + (vWorld - uCam) * k;
    float paint = floorPaint(f, uHalf);
    vec3 view = normalize(f - uCam);
    float fresnel = 0.05 + 0.95 * pow(1.0 - abs(view.y), 5.0);
    color *= (0.14 + 0.6 * fresnel) * exp(-depth * 2.8) * (1.0 - 0.6 * paint);
    // Reflections add to the floor rather than cover it.
    outColor = vec4(color * alpha, 0.0);
    return;
  }

  outColor = vec4(color * alpha, alpha);
}`;

export const POST_VERTEX = `#version 300 es
in vec2 aPosition;
out vec2 vUv;
void main() {
  vUv = aPosition * 0.5 + 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`;

// Thirteen taps, weighted to keep the bloom from flickering as the camera
// moves; the first step also keeps only what is bright enough to bleed.
export const DOWN_FRAGMENT = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform sampler2D uSource;
uniform vec2 uTexel;
uniform float uThreshold;

vec3 tap(float x, float y) {
  return texture(uSource, vUv + vec2(x, y) * uTexel).rgb;
}

void main() {
  vec3 color =
    (tap(-1.0, -1.0) + tap(1.0, -1.0) + tap(-1.0, 1.0) + tap(1.0, 1.0)) * 0.125 +
    (tap(-2.0, -2.0) + tap(2.0, -2.0) + tap(-2.0, 2.0) + tap(2.0, 2.0)) * 0.03125 +
    (tap(0.0, -2.0) + tap(-2.0, 0.0) + tap(2.0, 0.0) + tap(0.0, 2.0)) * 0.0625 +
    tap(0.0, 0.0) * 0.125;
  if (uThreshold > 0.0) {
    float bright = max(max(color.r, color.g), color.b);
    float knee = uThreshold * 0.5;
    float soft = clamp(bright - uThreshold + knee, 0.0, 2.0 * knee);
    soft = soft * soft / (4.0 * knee + 1e-4);
    color *= max(soft, bright - uThreshold) / max(bright, 1e-4);
  }
  outColor = vec4(color, 1.0);
}`;

export const UP_FRAGMENT = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform sampler2D uSource;
uniform vec2 uTexel;

vec3 tap(float x, float y) {
  return texture(uSource, vUv + vec2(x, y) * uTexel).rgb;
}

void main() {
  vec3 color =
    tap(0.0, 0.0) * 4.0 +
    (tap(-1.0, 0.0) + tap(1.0, 0.0) + tap(0.0, -1.0) + tap(0.0, 1.0)) * 2.0 +
    tap(-1.0, -1.0) + tap(1.0, -1.0) + tap(-1.0, 1.0) + tap(1.0, 1.0);
  outColor = vec4(color / 16.0, 1.0);
}`;

// The lens's colour fringe, out toward the corners, can be set lighter for a
// frame with fine points of light in it, which it would split into three.
export const compositeFragment = (fringe = 0.007) => `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform sampler2D uScene;
uniform sampler2D uBloom;
uniform vec2 uRes;
uniform float uAspect;
uniform float uTime;
uniform float uGrain;
uniform float uExposure;
uniform float uBloomAmount;
${COMMON}

// Highlights roll off on the brightest channel, so a hue never shifts as it
// nears white.
vec3 shoulder(vec3 c) {
  float peak = max(max(c.r, c.g), c.b);
  const float K = 0.72;
  if (peak <= K) return c;
  float m = K + (1.0 - K) * (1.0 - exp(-(peak - K) / (1.0 - K)));
  return c * (m / peak);
}

void main() {
  vec2 c = vUv - 0.5;
  vec2 a = c * vec2(uAspect, 1.0);
  vec2 fringe = c * dot(a, a) * ${fringe.toFixed(4)};
  vec4 scene = texture(uScene, vUv);
  // Where the doorway is, the canvas is clear: the canon shows through it.
  // What the scene holds there is only the doorway's light, which blooms
  // over the edges and a little over the canon too. Where the floor is
  // glossy it is partly clear, and the canon's reflection adds to it.
  float cover = scene.a;
  vec3 color = vec3(
    texture(uScene, vUv - fringe).r,
    scene.g,
    texture(uScene, vUv + fringe).b
  ) * step(1e-3, cover);
  color += texture(uBloom, vUv).rgb * uBloomAmount;
  color = shoulder(color * uExposure);
  color *= mix(0.3, 1.0, smoothstep(1.15, 0.28, length(a) * 1.05));
  color = pow(max(color, 0.0), vec3(1.0 / 2.2));

  float grain = hash(floor(vUv * uRes / 1.5) + floor(uTime * 24.0) * 37.13) - 0.5;
  color += grain * uGrain * (0.25 + 0.75 * dot(color, vec3(0.3333))) * cover;
  // Premultiplied: light over the clear doorway adds to what is behind.
  outColor = vec4(max(color, 0.0), cover);
}`;

export const COMPOSITE_FRAGMENT = compositeFragment();
