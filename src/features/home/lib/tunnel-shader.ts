// The tunnel in two passes. The walls are traced per pixel: each ray meets
// the cylinder, and where it lands decides what it sees: the film strips that
// run along the floor and the ceiling with their sprocket holes lit from
// behind, the faint rings on the walls, and the ring of light that is today.
// The posters are then drawn as quads through the same camera, so they sit
// exactly in that space.

const COMMON = `
float hash(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * 0.1031);
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}

float roundedBox(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}
`;

export const WALL_FRAGMENT = `#version 300 es
precision highp float;

in vec2 vUv;
out vec4 outColor;

uniform vec2 uRes;
uniform vec3 uCam;
uniform vec3 uRight;
uniform vec3 uUp;
uniform vec3 uBack;
uniform float uTanH;
uniform float uAspect;
uniform float uTime;
uniform float uGate;
uniform float uVelocity;
uniform float uExposure;
uniform float uGrain;
uniform vec3 uWarm;
uniform vec3 uCool;

const float PI = 3.14159265;
${COMMON}

void main() {
  vec2 ndc = vec2(vUv.x * 2.0 - 1.0, 1.0 - vUv.y * 2.0);
  vec3 dir = normalize(uRight * ndc.x * uAspect * uTanH + uUp * ndc.y * uTanH - uBack);

  float a = max(dot(dir.xy, dir.xy), 1e-6);
  float b = dot(uCam.xy, dir.xy);
  float c = dot(uCam.xy, uCam.xy) - 1.0;
  float t = min((-b + sqrt(max(b * b - a * c, 0.0))) / a, 200.0);
  vec3 p = uCam + dir * t;
  float angle = atan(p.y, p.x);
  float z = p.z;

  float future = smoothstep(uGate + 0.9, uGate - 0.9, z);
  vec3 tint = mix(uWarm, uCool, future);

  // Distance, along the wall, from the centre line of the floor or ceiling.
  float s = abs(abs(angle) - PI * 0.5);
  float sw = max(fwidth(s), 1e-4);
  float zw = max(fwidth(z), 1e-4);

  vec3 color = vec3(0.014, 0.014, 0.017);

  // The film strips.
  float strip = 1.0 - smoothstep(0.4 - sw, 0.4 + sw, s);
  float image = 1.0 - smoothstep(0.27 - sw, 0.27 + sw, s);
  float frameLine = abs(fract(z / 0.64 + 0.5) - 0.5) * 0.64;
  float frames = image * smoothstep(0.006 + zw, 0.006, frameLine);
  color = mix(color, vec3(0.02) + tint * 0.014, strip);
  color += tint * image * 0.022 * (1.0 - s / 0.27);
  color *= 1.0 - frames * 0.6;

  float stretch = min(abs(uVelocity) * 0.035, 0.03);
  vec2 hole = vec2(s - 0.335, (fract(z / 0.16) - 0.5) * 0.16);
  float hd = roundedBox(hole, vec2(0.021, 0.032 + stretch), 0.009);
  float hw = max(fwidth(hd), 1e-4);
  color += tint * (1.0 - smoothstep(-hw, hw, hd)) * 0.95;

  // Rings around the walls, every few steps.
  float ring = abs(fract(z / 0.9 + 0.5) - 0.5) * 0.9;
  color += tint * (1.0 - strip) * smoothstep(0.003 + zw, 0.0, ring) * 0.1;
  // Light from the walls' own glow, strongest beside the camera.
  color += tint * 0.018 * (1.0 - strip);

  // Today.
  float g = abs(z - uGate);
  color += mix(tint, vec3(1.0), 0.55) * exp(-g * 26.0) * 1.6;
  color += tint * exp(-g * 2.6) * 0.1;

  color *= exp(-t * 0.17);

  // The far end of the tunnel holds a little light.
  float ahead = max(-dir.z, 0.0);
  color += tint * pow(ahead, 90.0) * 0.18;

  color *= uExposure;
  float vignette = smoothstep(1.5, 0.35, length(ndc * vec2(uAspect, 1.0) * 0.62));
  color *= 0.55 + 0.45 * vignette;

  float grain = hash(floor(vUv * uRes / 1.5) + floor(uTime * 24.0) * 37.13) - 0.5;
  color += grain * uGrain * (0.012 + 0.8 * dot(color, vec3(0.3333)));

  outColor = vec4(max(color, 0.0), 1.0);
}`;

export const POSTER_VERTEX = `#version 300 es
in vec2 aCorner;

uniform mat4 uViewProj;
uniform vec3 uCenter;
uniform vec2 uSize;
uniform float uYaw;

out vec2 vUv;
out vec3 vWorld;

void main() {
  vec3 right = vec3(cos(uYaw), 0.0, -sin(uYaw));
  vec3 world = uCenter + right * aCorner.x * uSize.x + vec3(0.0, aCorner.y * uSize.y, 0.0);
  vUv = vec2(aCorner.x + 0.5, 0.5 - aCorner.y);
  vWorld = world;
  gl_Position = uViewProj * vec4(world, 1.0);
}`;

export const POSTER_FRAGMENT = `#version 300 es
precision highp float;

in vec2 vUv;
in vec3 vWorld;
out vec4 outColor;

uniform sampler2D uAtlas;
uniform vec4 uCell;
uniform vec2 uSize;
uniform vec3 uCam;
uniform float uLoaded;
uniform float uHover;
uniform vec3 uTint;
uniform float uExposure;
${COMMON}

void main() {
  vec2 q = (vUv - 0.5) * uSize;
  float d = roundedBox(q, uSize * 0.5, 0.012);
  float w = max(fwidth(d), 1e-5);
  float alpha = 1.0 - smoothstep(-w, w, d);

  vec3 art = texture(uAtlas, uCell.xy + vUv * uCell.zw).rgb;
  vec3 color = mix(vec3(0.045, 0.045, 0.05), art, uLoaded);
  color *= 0.84 + 0.14 * (1.0 - vUv.y) + 0.2 * uHover;

  float rim = 1.0 - smoothstep(0.0, 0.006, -d);
  color += uTint * rim * (0.25 + 0.6 * uHover);

  float dist = length(vWorld - uCam);
  float fog = exp(-max(dist - 0.9, 0.0) * 0.17);
  color *= fog * uExposure;
  // Far off a poster comes out of the dark; close by it dissolves as the
  // camera passes, so it never stands in front of the credits.
  alpha *= 1.0 - smoothstep(5.0, 9.5, dist);
  alpha *= smoothstep(0.9, 2.0, uCam.z - vWorld.z);

  outColor = vec4(color * alpha, alpha);
}`;
