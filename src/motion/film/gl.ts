const FULLSCREEN_VERTEX = `#version 300 es
in vec2 aPosition;
out vec2 vUv;
void main() {
  vUv = vec2(aPosition.x * 0.5 + 0.5, 0.5 - aPosition.y * 0.5);
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`;

function compile(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export function createProgram(
  gl: WebGL2RenderingContext,
  fragment: string,
  vertex = FULLSCREEN_VERTEX,
) {
  const vs = compile(gl, gl.VERTEX_SHADER, vertex);
  const fs = compile(gl, gl.FRAGMENT_SHADER, fragment);
  if (!vs || !fs) return null;
  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    return null;
  }
  return program;
}

export function bindFullscreen(
  gl: WebGL2RenderingContext,
  program: WebGLProgram,
) {
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 3, -1, -1, 3]),
    gl.STATIC_DRAW,
  );
  const location = gl.getAttribLocation(program, "aPosition");
  gl.enableVertexAttribArray(location);
  gl.vertexAttribPointer(location, 2, gl.FLOAT, false, 0, 0);
}

export function uniforms<T extends string>(
  gl: WebGL2RenderingContext,
  program: WebGLProgram,
  names: readonly T[],
) {
  return Object.fromEntries(
    names.map((name) => [name, gl.getUniformLocation(program, name)]),
  ) as Record<T, WebGLUniformLocation | null>;
}

export function fitCanvas(canvas: HTMLCanvasElement, cap: number) {
  const ratio = Math.min(window.devicePixelRatio || 1, cap);
  const width = Math.max(1, Math.round(canvas.clientWidth * ratio));
  const height = Math.max(1, Math.round(canvas.clientHeight * ratio));
  if (canvas.width === width && canvas.height === height) return false;
  canvas.width = width;
  canvas.height = height;
  return true;
}

// TMDB sends its CORS header only to a request that carries an Origin, and its
// cache does not vary on it: a picture first shown by a plain <img> is kept
// without the header, and a CORS read of the same address is then refused from
// that copy until the cache is bypassed. Pictures read into a canvas or a
// texture are asked for under their own name, so they never meet it.
export const readable = (src: string) =>
  `${src}${src.includes("?") ? "&" : "?"}gl`;

// A cut between two reels, as film burns through in the gate: a hot rim
// spreads from one point across the frame, the next picture behind it, and the
// whole frame flashes over-exposed at its height.
export const BURN = `
float burnHash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float burnNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(burnHash(i), burnHash(i + vec2(1.0, 0.0)), u.x),
    mix(burnHash(i + vec2(0.0, 1.0)), burnHash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float burnField(vec2 uv, float aspect, vec2 from, float seed) {
  vec2 p = uv * vec2(aspect, 1.0);
  float n = burnNoise(p * 2.0 + seed) * 0.5
    + burnNoise(p * 4.3 + seed * 1.7) * 0.3
    + burnNoise(p * 9.1 - seed) * 0.2;
  float reach = 1.0 - length((uv - from) * vec2(aspect, 1.0)) / (0.9 * max(aspect, 1.0));
  return clamp(reach * 0.6 + n * 0.4, 0.0, 1.0);
}

// x: how much of the next reel shows; y: the heat of the burning rim.
vec2 burn(float field, float cut) {
  if (cut <= 0.0) return vec2(0.0);
  if (cut >= 1.0) return vec2(1.0, 0.0);
  float edge = 1.0 - cut * 1.3;
  float shown = smoothstep(edge - 0.015, edge + 0.015, field);
  float rim = 1.0 - smoothstep(0.0, 0.07, abs(field - edge));
  return vec2(shown, rim);
}

vec3 burnLight(vec3 color, float cut, vec2 burnt) {
  float flash = pow(sin(3.14159265 * clamp(cut, 0.0, 1.0)), 6.0);
  color += vec3(1.0, 0.58, 0.24) * burnt.y * 1.4;
  color += vec3(1.0, 0.93, 0.82) * flash * 0.28;
  return color;
}
`;

// The same picture at a size meant for light, not for looking at: a room
// tint needs a few hundred pixels, whatever size the page showed it at.
export const thumbnail = (src: string) =>
  src.replace(/\/t\/p\/[^/]+\//, "/t/p/w300/");
