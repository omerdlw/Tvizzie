import { createProgram, readable, uniforms } from "@/motion/film/gl";
import type { Camera } from "./tunnel-camera";
import type { Portal } from "./portal";
import type { FloorPaint } from "./tunnel-floor";
import type { Corridor, Poster } from "./tunnel-scene";
import {
  COMPOSITE_FRAGMENT,
  DOWN_FRAGMENT,
  MAX_LIGHTS,
  POST_VERTEX,
  POSTER_FRAGMENT,
  POSTER_VERTEX,
  ROOM_FRAGMENT,
  UP_FRAGMENT,
} from "./tunnel-shader";

const ROOM = [
  "uCam",
  "uRight",
  "uUp",
  "uBack",
  "uTanH",
  "uAspect",
  "uBox",
  "uGate",
  "uGatePower",
  "uPortal",
  "uBeyond",
  "uBeyondReady",
  "uDoorColour",
  "uTime",
  "uFloor",
  "uFloorSpan",
  "uFloorStrips",
  "uFloorReady",
  "uLights",
  "uLightPos",
  "uLightDir",
  "uLightColor",
] as const;

const POSTER = [
  "uViewProj",
  "uCenter",
  "uSize",
  "uYaw",
  "uMirror",
  "uFloorY",
  "uPrint",
  "uCrop",
  "uCam",
  "uLoaded",
  "uHover",
  "uPower",
  "uHalf",
  "uFloor",
  "uFloorSpan",
  "uFloorStrips",
  "uFloorReady",
] as const;

const DOWN = ["uSource", "uTexel", "uThreshold"] as const;
const UP = ["uSource", "uTexel"] as const;
const COMPOSITE = [
  "uScene",
  "uBloom",
  "uRes",
  "uAspect",
  "uTime",
  "uGrain",
  "uExposure",
  "uBloomAmount",
] as const;

type Locations<T extends readonly string[]> = Record<
  T[number],
  WebGLUniformLocation | null
>;

const FADE_MS = 900;
// Texels the floor paint may take, all strips together. One channel each.
const FLOOR_BUDGET = 48_000_000;
const STRIP = 4096;
const BLOOM_LEVELS = 6;

export interface TunnelFrame {
  camera: Camera;
  corridor: Corridor;
  exposure: number;
  gate: number;
  gatePower: number;
  grain: number;
  portal: number;
  hover: readonly number[];
  power: readonly number[];
  time: number;
}

interface Slot {
  arrived: number;
  // The part of the print that is 2:3, as offset and scale.
  crop: [number, number, number, number];
  // The light the poster throws, linear.
  light: [number, number, number];
  ready: boolean;
  // Its hue at full strength, for the page around it.
  swatch: string;
  texture: WebGLTexture | null;
}

interface Target {
  fbo: WebGLFramebuffer;
  height: number;
  texture: WebGLTexture;
  width: number;
}

const linear = (value: number) => (value / 255) ** 2.2;

// What colour a print throws when it is lit from behind: its average, kept
// to a common strength so a dark poster still lights its corner a little.
function lightOf(image: HTMLImageElement): {
  light: [number, number, number];
  swatch: string;
} | null {
  const probe = document.createElement("canvas");
  probe.width = 6;
  probe.height = 9;
  const ctx = probe.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(image, 0, 0, probe.width, probe.height);
  const { data } = ctx.getImageData(0, 0, probe.width, probe.height);
  let r = 0;
  let g = 0;
  let b = 0;
  const count = data.length / 4;
  for (let i = 0; i < data.length; i += 4) {
    r += linear(data[i]!);
    g += linear(data[i + 1]!);
    b += linear(data[i + 2]!);
  }
  r /= count;
  g /= count;
  b /= count;
  const luma = Math.max(0.0001, 0.2126 * r + 0.7152 * g + 0.0722 * b);
  const strength = luma * 0.4 + 0.3;
  // A touch more colour than the average, which always drifts to grey.
  const vivid = (c: number) => Math.max(0, luma + (c / luma - 1) * 1.3 * luma);
  const light: [number, number, number] = [
    (vivid(r) / luma) * strength,
    (vivid(g) / luma) * strength,
    (vivid(b) / luma) * strength,
  ];
  const peak = Math.max(...light, 0.0001);
  const swatch = light
    .map((c) => Math.round(255 * (0.25 + (0.75 * c) / peak) ** (1 / 2.2)))
    .join(" ");
  return { light, swatch: `rgb(${swatch})` };
}

function explain(gl: WebGL2RenderingContext, type: number, source: string) {
  if (process.env.NODE_ENV === "production") return;
  const shader = gl.createShader(type);
  if (!shader) return;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  const log = gl.getShaderInfoLog(shader);
  if (log) console.error(log);
  gl.deleteShader(shader);
}

export class TunnelRenderer {
  readonly lost: Promise<void>;
  private readonly gl: WebGL2RenderingContext;
  private readonly room: WebGLProgram;
  private readonly poster: WebGLProgram;
  private readonly down: WebGLProgram;
  private readonly up: WebGLProgram;
  private readonly composite: WebGLProgram;
  private readonly ur: Locations<typeof ROOM>;
  private readonly up_: Locations<typeof POSTER>;
  private readonly ud: Locations<typeof DOWN>;
  private readonly uu: Locations<typeof UP>;
  private readonly uc: Locations<typeof COMPOSITE>;
  private readonly fullVao: WebGLVertexArrayObject;
  private readonly quadVao: WebGLVertexArrayObject;
  private floor: WebGLTexture;
  private readonly slots: Slot[];
  private readonly hdr: boolean;
  private readonly anisotropy: {
    ext: EXT_texture_filter_anisotropic;
    max: number;
  } | null;
  private scene: Target | null = null;
  private bloom: Target[] = [];
  private floorSpan: [number, number] = [1, 0];
  private floorStrips: [number, number] = [1, 1];
  private floorReady = 0;
  private readonly beyond: WebGLTexture;
  private beyondVersion = 0;
  private readonly doorColour: [number, number, number] = [0, 0, 0];
  private disposed = false;
  private onLost: () => void = () => {};
  private readonly lightPos = new Float32Array(MAX_LIGHTS * 3);
  private readonly lightDir = new Float32Array(MAX_LIGHTS * 3);
  private readonly lightColor = new Float32Array(MAX_LIGHTS * 3);

  static create(
    canvas: HTMLCanvasElement,
    posters: readonly (string | null)[],
  ): TunnelRenderer | null {
    // The canvas is clear in the doorway, so the canon behind it shows
    // through; everywhere else it is opaque.
    const gl = canvas.getContext("webgl2", {
      alpha: true,
      antialias: false,
      depth: false,
      powerPreference: "high-performance",
      premultipliedAlpha: true,
      stencil: false,
    });
    if (!gl) return null;
    const room = createProgram(gl, ROOM_FRAGMENT);
    const poster = createProgram(gl, POSTER_FRAGMENT, POSTER_VERTEX);
    const down = createProgram(gl, DOWN_FRAGMENT, POST_VERTEX);
    const up = createProgram(gl, UP_FRAGMENT, POST_VERTEX);
    const composite = createProgram(gl, COMPOSITE_FRAGMENT, POST_VERTEX);
    if (!room || !poster || !down || !up || !composite) {
      if (!room) explain(gl, gl.FRAGMENT_SHADER, ROOM_FRAGMENT);
      if (!poster) {
        explain(gl, gl.VERTEX_SHADER, POSTER_VERTEX);
        explain(gl, gl.FRAGMENT_SHADER, POSTER_FRAGMENT);
      }
      if (!down) explain(gl, gl.FRAGMENT_SHADER, DOWN_FRAGMENT);
      if (!up) explain(gl, gl.FRAGMENT_SHADER, UP_FRAGMENT);
      if (!composite) explain(gl, gl.FRAGMENT_SHADER, COMPOSITE_FRAGMENT);
      return null;
    }
    return new TunnelRenderer(
      canvas,
      gl,
      [room, poster, down, up, composite],
      posters,
    );
  }

  private constructor(
    private readonly canvas: HTMLCanvasElement,
    gl: WebGL2RenderingContext,
    programs: [
      WebGLProgram,
      WebGLProgram,
      WebGLProgram,
      WebGLProgram,
      WebGLProgram,
    ],
    posters: readonly (string | null)[],
  ) {
    this.gl = gl;
    [this.room, this.poster, this.down, this.up, this.composite] = programs;
    this.ur = uniforms(gl, this.room, ROOM);
    this.up_ = uniforms(gl, this.poster, POSTER);
    this.ud = uniforms(gl, this.down, DOWN);
    this.uu = uniforms(gl, this.up, UP);
    this.uc = uniforms(gl, this.composite, COMPOSITE);
    this.hdr = Boolean(gl.getExtension("EXT_color_buffer_float"));
    const ext = gl.getExtension("EXT_texture_filter_anisotropic");
    this.anisotropy = ext
      ? {
          ext,
          max: Math.min(
            8,
            gl.getParameter(ext.MAX_TEXTURE_MAX_ANISOTROPY_EXT) as number,
          ),
        }
      : null;

    // Every full-screen pass shares one triangle; each program reads it
    // under the same attribute name.
    this.fullVao = this.geometry(
      [this.room, this.down, this.up, this.composite],
      "aPosition",
      [-1, -1, 3, -1, -1, 3],
    );
    this.quadVao = this.geometry(
      [this.poster],
      "aCorner",
      [-0.5, -0.5, 0.5, -0.5, -0.5, 0.5, 0.5, 0.5],
    );

    this.floor = this.blankFloor();
    this.beyond = this.texture(gl.LINEAR_MIPMAP_LINEAR);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      1,
      1,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      new Uint8Array(4),
    );

    this.slots = posters.map(() => ({
      arrived: 0,
      crop: [0, 0, 1, 1],
      light: [0, 0, 0],
      ready: false,
      swatch: "rgb(255 255 255)",
      texture: null,
    }));
    posters.forEach((src, index) => {
      if (src) this.load(src, index);
    });

    this.lost = new Promise((resolve) => {
      this.onLost = resolve;
    });
    canvas.addEventListener("webglcontextlost", this.handleLost);
  }

  private readonly handleLost = (event: Event) => {
    event.preventDefault();
    this.onLost();
  };

  private texture(
    min: number,
    target: number = this.gl.TEXTURE_2D,
  ): WebGLTexture {
    const gl = this.gl;
    const texture = gl.createTexture();
    gl.bindTexture(target, texture);
    gl.texParameteri(target, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(target, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(target, gl.TEXTURE_MIN_FILTER, min);
    gl.texParameteri(target, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    return texture;
  }

  // Sharper prints and paint where the corridor meets them at a slant.
  private sharpen(target: number) {
    if (!this.anisotropy) return;
    this.gl.texParameterf(
      target,
      this.anisotropy.ext.TEXTURE_MAX_ANISOTROPY_EXT,
      this.anisotropy.max,
    );
  }

  private blankFloor(): WebGLTexture {
    const gl = this.gl;
    const texture = this.texture(gl.LINEAR, gl.TEXTURE_2D_ARRAY);
    gl.texImage3D(
      gl.TEXTURE_2D_ARRAY,
      0,
      gl.R8,
      1,
      1,
      1,
      0,
      gl.RED,
      gl.UNSIGNED_BYTE,
      new Uint8Array(1),
    );
    return texture;
  }

  private geometry(programs: WebGLProgram[], name: string, data: number[]) {
    const gl = this.gl;
    const array = gl.createVertexArray();
    gl.bindVertexArray(array);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
    for (const program of programs) {
      const location = gl.getAttribLocation(program, name);
      if (location < 0) continue;
      gl.enableVertexAttribArray(location);
      gl.vertexAttribPointer(location, 2, gl.FLOAT, false, 0, 0);
    }
    gl.bindVertexArray(null);
    return array;
  }

  private target(width: number, height: number): Target {
    const gl = this.gl;
    const texture = this.texture(gl.LINEAR);
    if (this.hdr) {
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA16F,
        width,
        height,
        0,
        gl.RGBA,
        gl.HALF_FLOAT,
        null,
      );
    } else {
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        width,
        height,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        null,
      );
    }
    const fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      texture,
      0,
    );
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return { fbo, height, texture, width };
  }

  private release(target: Target | null) {
    if (!target) return;
    this.gl.deleteFramebuffer(target.fbo);
    this.gl.deleteTexture(target.texture);
  }

  private fit(width: number, height: number) {
    if (this.scene?.width === width && this.scene.height === height) return;
    this.release(this.scene);
    this.bloom.forEach((level) => this.release(level));
    this.scene = this.target(width, height);
    this.bloom = [];
    let w = width;
    let h = height;
    for (let i = 0; i < BLOOM_LEVELS; i += 1) {
      w = Math.max(1, w >> 1);
      h = Math.max(1, h >> 1);
      this.bloom.push(this.target(w, h));
      if (w < 8 || h < 8) break;
    }
  }

  private load(src: string, index: number): void {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.decoding = "async";
    image.src = readable(src);
    void image
      .decode()
      .then(() => {
        if (this.disposed || this.gl.isContextLost()) return;
        const gl = this.gl;
        const texture = this.texture(gl.LINEAR_MIPMAP_LINEAR);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.RGBA,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          image,
        );
        gl.generateMipmap(gl.TEXTURE_2D);
        this.sharpen(gl.TEXTURE_2D);
        // Trim whatever does not fit 2:3, evenly from both sides.
        const ratio = image.naturalWidth / image.naturalHeight / (2 / 3);
        const crop: Slot["crop"] =
          ratio > 1
            ? [(1 - 1 / ratio) / 2, 0, 1 / ratio, 1]
            : [0, (1 - ratio) / 2, 1, ratio];
        const lit = lightOf(image);
        this.slots[index] = {
          arrived: performance.now(),
          crop,
          light: lit?.light ?? [0.5, 0.5, 0.5],
          ready: true,
          swatch: lit?.swatch ?? "rgb(255 255 255)",
          texture,
        };
      })
      .catch(() => undefined);
  }

  // How much floor paint this device can hold, for `paintFloor`.
  get floorBudget(): { budget: number; limit: number } {
    const gl = this.gl;
    const layers = gl.getParameter(gl.MAX_ARRAY_TEXTURE_LAYERS) as number;
    const strip = Math.min(STRIP, this.maxTexture);
    return {
      budget: Math.min(FLOOR_BUDGET, layers * strip * this.maxTexture),
      limit: this.maxTexture,
    };
  }

  // Lays the paint down strip by strip, each a layer of one array texture.
  setFloor(paint: FloorPaint): void {
    const gl = this.gl;
    if (gl.isContextLost()) return;
    const strip = Math.min(STRIP, this.maxTexture);
    const layers = Math.max(1, Math.ceil(paint.height / strip));
    const canvas = document.createElement("canvas");
    canvas.width = paint.width;
    canvas.height = strip;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    gl.deleteTexture(this.floor);
    this.floor = this.texture(gl.LINEAR_MIPMAP_LINEAR, gl.TEXTURE_2D_ARRAY);
    const levels = Math.floor(Math.log2(Math.max(paint.width, strip))) + 1;
    gl.texStorage3D(
      gl.TEXTURE_2D_ARRAY,
      levels,
      gl.R8,
      paint.width,
      strip,
      layers,
    );
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    for (let layer = 0; layer < layers; layer += 1) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(1, 0, 0, 1, 0, -layer * strip);
      paint.draw(ctx);
      gl.texSubImage3D(
        gl.TEXTURE_2D_ARRAY,
        0,
        0,
        0,
        layer,
        paint.width,
        strip,
        1,
        gl.RED,
        gl.UNSIGNED_BYTE,
        canvas,
      );
    }
    gl.generateMipmap(gl.TEXTURE_2D_ARRAY);
    this.sharpen(gl.TEXTURE_2D_ARRAY);
    this.floorSpan = [paint.near, paint.far];
    this.floorStrips = [paint.height / strip, layers];
    this.floorReady = 1;
  }

  // The canon as it would be seen through the doorway, and the colour of
  // the light it throws down the corridor.
  setBeyond(
    copy: Portal["beyond"],
    colour: readonly [number, number, number],
  ): void {
    const gl = this.gl;
    // The light follows the wall, a little behind it.
    for (let i = 0; i < 3; i += 1) {
      const now = this.doorColour[i]!;
      this.doorColour[i] = now + (colour[i]! - now) * 0.08;
    }
    if (gl.isContextLost() || copy.version === this.beyondVersion) return;
    if (copy.width < 1 || copy.height < 1) return;
    this.beyondVersion = copy.version;
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, this.beyond);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      copy.width,
      copy.height,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      copy.pixels,
    );
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.activeTexture(gl.TEXTURE0);
  }

  // The hue a poster throws, once its print has arrived.
  swatch(index: number): string | null {
    const slot = this.slots[index];
    return slot?.ready ? slot.swatch : null;
  }

  private loaded(index: number, now: number): number {
    const slot = this.slots[index];
    return slot?.ready ? Math.min(1, (now - slot.arrived) / FADE_MS) : 0;
  }

  get maxTexture(): number {
    return this.gl.getParameter(this.gl.MAX_TEXTURE_SIZE) as number;
  }

  draw(frame: TunnelFrame, posters: readonly Poster[]): void {
    const gl = this.gl;
    if (gl.isContextLost()) return;
    const { height, width } = this.canvas;
    this.fit(width, height);
    const scene = this.scene!;
    const cam = frame.camera;
    const camZ = cam.position[2];
    const now = performance.now();
    const { ceiling, floor, half } = frame.corridor;

    // The lightboxes nearest the camera light the corridor.
    const lights = posters
      .map((poster, index) => ({ index, poster }))
      .filter(({ poster }) => poster.z < camZ + 3 && camZ - poster.z < 18)
      .sort(
        (a, b) =>
          Math.abs(camZ - 1.5 - a.poster.z) - Math.abs(camZ - 1.5 - b.poster.z),
      )
      .slice(0, MAX_LIGHTS);
    lights.forEach(({ index, poster }, i) => {
      const nx = Math.sin(poster.yaw);
      const nz = Math.cos(poster.yaw);
      const strength =
        this.loaded(index, now) *
        (frame.power[index] ?? 0) *
        (1 + 0.4 * (frame.hover[index] ?? 0));
      const light = this.slots[index]?.light ?? [0, 0, 0];
      this.lightPos.set(
        [poster.x + nx * 0.05, poster.y, poster.z + nz * 0.05],
        i * 3,
      );
      this.lightDir.set([nx, 0, nz], i * 3);
      this.lightColor.set(
        light.map((c) => c * strength),
        i * 3,
      );
    });

    // The corridor.
    gl.bindFramebuffer(gl.FRAMEBUFFER, scene.fbo);
    gl.viewport(0, 0, scene.width, scene.height);
    gl.disable(gl.BLEND);
    gl.useProgram(this.room);
    gl.bindVertexArray(this.fullVao);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, this.floor);
    const r = this.ur;
    gl.uniform3f(r.uCam, ...cam.position);
    gl.uniform3f(r.uRight, ...cam.right);
    gl.uniform3f(r.uUp, ...cam.up);
    gl.uniform3f(r.uBack, ...cam.back);
    gl.uniform1f(r.uTanH, cam.tanHalf);
    gl.uniform1f(r.uAspect, width / height);
    gl.uniform3f(r.uBox, half, floor, ceiling);
    gl.uniform1f(r.uGate, frame.gate);
    gl.uniform1f(r.uGatePower, frame.gatePower);
    gl.uniform1f(r.uPortal, frame.portal);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, this.beyond);
    gl.uniform1i(r.uBeyond, 2);
    gl.uniform1f(r.uBeyondReady, this.beyondVersion > 0 ? 1 : 0);
    gl.uniform3f(r.uDoorColour, ...this.doorColour);
    gl.uniform1f(r.uTime, frame.time);
    gl.activeTexture(gl.TEXTURE0);
    gl.uniform1i(r.uFloor, 1);
    gl.uniform2f(r.uFloorSpan, ...this.floorSpan);
    gl.uniform2f(r.uFloorStrips, ...this.floorStrips);
    gl.uniform1f(r.uFloorReady, this.floorReady);
    gl.uniform1i(r.uLights, lights.length);
    gl.uniform3fv(r.uLightPos, this.lightPos);
    gl.uniform3fv(r.uLightDir, this.lightDir);
    gl.uniform3fv(r.uLightColor, this.lightColor);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    // The posters: first their reflections in the floor, then themselves,
    // farthest first.
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.useProgram(this.poster);
    gl.bindVertexArray(this.quadVao);
    const p = this.up_;
    gl.uniform1i(p.uPrint, 0);
    gl.uniform1i(p.uFloor, 1);
    gl.uniformMatrix4fv(p.uViewProj, false, cam.viewProj);
    gl.uniform3f(p.uCam, ...cam.position);
    gl.uniform1f(p.uFloorY, floor);
    gl.uniform1f(p.uHalf, half);
    gl.uniform2f(p.uFloorSpan, ...this.floorSpan);
    gl.uniform2f(p.uFloorStrips, ...this.floorStrips);
    gl.uniform1f(p.uFloorReady, this.floorReady);

    const order = posters
      .map((poster, index) => ({ index, poster }))
      .filter(({ poster }) => poster.z < camZ - 0.2 && camZ - poster.z < 30)
      .sort((a, b) => a.poster.z - b.poster.z);
    gl.activeTexture(gl.TEXTURE0);
    for (const mirror of [1, 0]) {
      gl.uniform1f(p.uMirror, mirror);
      for (const { index, poster } of order) {
        gl.uniform3f(p.uCenter, poster.x, poster.y, poster.z);
        gl.uniform2f(p.uSize, poster.w, poster.h);
        gl.uniform1f(p.uYaw, poster.yaw);
        const slot = this.slots[index];
        gl.bindTexture(gl.TEXTURE_2D, slot?.texture ?? null);
        gl.uniform4f(p.uCrop, ...(slot?.crop ?? [0, 0, 1, 1]));
        gl.uniform1f(p.uLoaded, this.loaded(index, now));
        gl.uniform1f(p.uHover, frame.hover[index] ?? 0);
        gl.uniform1f(p.uPower, frame.power[index] ?? 0);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      }
    }

    // Bloom: halve the frame down a chain, keeping only what is bright at
    // the first step, then add the chain back up.
    gl.disable(gl.BLEND);
    gl.useProgram(this.down);
    gl.bindVertexArray(this.fullVao);
    gl.uniform1i(this.ud.uSource, 0);
    let source = scene;
    this.bloom.forEach((level, i) => {
      gl.bindFramebuffer(gl.FRAMEBUFFER, level.fbo);
      gl.viewport(0, 0, level.width, level.height);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, source.texture);
      gl.uniform2f(this.ud.uTexel, 1 / source.width, 1 / source.height);
      gl.uniform1f(this.ud.uThreshold, i === 0 ? (this.hdr ? 0.85 : 0.6) : 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      source = level;
    });
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.useProgram(this.up);
    gl.uniform1i(this.uu.uSource, 0);
    for (let i = this.bloom.length - 1; i > 0; i -= 1) {
      const from = this.bloom[i]!;
      const to = this.bloom[i - 1]!;
      gl.bindFramebuffer(gl.FRAMEBUFFER, to.fbo);
      gl.viewport(0, 0, to.width, to.height);
      gl.bindTexture(gl.TEXTURE_2D, from.texture);
      gl.uniform2f(this.uu.uTexel, 1 / from.width, 1 / from.height);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    gl.disable(gl.BLEND);

    // Develop.
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, width, height);
    gl.useProgram(this.composite);
    const c = this.uc;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, scene.texture);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.bloom[0]?.texture ?? scene.texture);
    gl.uniform1i(c.uScene, 0);
    gl.uniform1i(c.uBloom, 1);
    gl.uniform2f(c.uRes, width, height);
    gl.uniform1f(c.uAspect, width / height);
    gl.uniform1f(c.uTime, frame.time);
    gl.uniform1f(c.uGrain, frame.grain);
    gl.uniform1f(c.uExposure, frame.exposure);
    gl.uniform1f(c.uBloomAmount, this.hdr ? 0.5 : 0.35);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindVertexArray(null);
  }

  dispose(): void {
    this.disposed = true;
    this.canvas.removeEventListener("webglcontextlost", this.handleLost);
    const gl = this.gl;
    if (gl.isContextLost()) return;
    this.release(this.scene);
    this.bloom.forEach((level) => this.release(level));
    this.slots.forEach((slot) => gl.deleteTexture(slot.texture));
    gl.deleteTexture(this.floor);
    gl.deleteTexture(this.beyond);
    gl.deleteVertexArray(this.fullVao);
    gl.deleteVertexArray(this.quadVao);
    for (const program of [
      this.room,
      this.poster,
      this.down,
      this.up,
      this.composite,
    ]) {
      gl.deleteProgram(program);
    }
  }
}
