import { createProgram, readable, uniforms } from "@/motion/film/gl";
import type { StageLayout } from "./curtain";
import { CURTAIN_FRAGMENT } from "./curtain-shader";
import {
  COMPOSITE_FRAGMENT,
  DOWN_FRAGMENT,
  POST_VERTEX,
  UP_FRAGMENT,
} from "./tunnel-shader";

const SCENE = [
  "uRes",
  "uTime",
  "uLook",
  "uStage",
  "uSeats",
  "uScreen",
  "uOpen",
  "uSwing",
  "uLit",
  "uProject",
  "uFilmLight",
  "uFilm",
  "uFilmFit",
  "uHover",
  "uDigits",
  "uYear",
  "uYearAt",
  "uYearOn",
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

const BLOOM_LEVELS = 6;
const FILM_FADE_MS = 500;
// One cell of the digit strip, and the strip of 0 to 9 and 0 again.
const CELL_W = 112;
const CELL_H = 256;

export interface CurtainFrame {
  exposure: number;
  grain: number;
  hover: number;
  layout: StageLayout;
  lit: number;
  look: { x: number; y: number };
  open: number;
  project: number;
  swing: number;
  time: number;
  // Four digits, each 0..10, turning.
  year: Float32Array;
  yearOn: number;
}

interface Target {
  fbo: WebGLFramebuffer;
  height: number;
  texture: WebGLTexture;
  width: number;
}

const linear = (value: number) => (value / 255) ** 2.2;

// The colour a picture throws on what is around it: its average, leaning a
// little toward its most colourful part, kept to a common strength.
function lightOf(image: HTMLImageElement): [number, number, number] {
  const probe = document.createElement("canvas");
  probe.width = 8;
  probe.height = 5;
  const ctx = probe.getContext("2d", { willReadFrequently: true });
  if (!ctx) return [0.3, 0.28, 0.25];
  ctx.drawImage(image, 0, 0, probe.width, probe.height);
  const { data } = ctx.getImageData(0, 0, probe.width, probe.height);
  let r = 0;
  let g = 0;
  let b = 0;
  let weight = 0;
  for (let i = 0; i < data.length; i += 4) {
    const pr = linear(data[i]!);
    const pg = linear(data[i + 1]!);
    const pb = linear(data[i + 2]!);
    const w = 0.2 + (Math.max(pr, pg, pb) - Math.min(pr, pg, pb)) * 4;
    r += pr * w;
    g += pg * w;
    b += pb * w;
    weight += w;
  }
  r /= weight;
  g /= weight;
  b /= weight;
  const luma = Math.max(1e-4, 0.2126 * r + 0.7152 * g + 0.0722 * b);
  const strength = 0.22 + luma * 0.5;
  return [(r / luma) * strength, (g / luma) * strength, (b / luma) * strength];
}

export class CurtainRenderer {
  readonly lost: Promise<void>;
  private readonly gl: WebGL2RenderingContext;
  private readonly scene: WebGLProgram;
  private readonly down: WebGLProgram;
  private readonly up: WebGLProgram;
  private readonly composite: WebGLProgram;
  private readonly us: Locations<typeof SCENE>;
  private readonly ud: Locations<typeof DOWN>;
  private readonly uu: Locations<typeof UP>;
  private readonly uc: Locations<typeof COMPOSITE>;
  private readonly vao: WebGLVertexArrayObject;
  private readonly hdr: boolean;
  private readonly film: WebGLTexture;
  private readonly digits: WebGLTexture;
  private target: Target | null = null;
  private bloom: Target[] = [];
  private filmSize: [number, number] = [16, 9];
  private filmCover = true;
  private filmLight: [number, number, number] = [0, 0, 0];
  private filmAt = 0;
  private wanted = -1;
  private token = 0;
  private disposed = false;
  private onLost: () => void = () => {};
  // The film on the screen, or -1 while there is none.
  shown = -1;

  static create(canvas: HTMLCanvasElement): CurtainRenderer | null {
    const gl = canvas.getContext("webgl2", {
      alpha: false,
      antialias: false,
      depth: false,
      powerPreference: "high-performance",
      premultipliedAlpha: false,
      stencil: false,
    });
    if (!gl) return null;
    const scene = createProgram(gl, CURTAIN_FRAGMENT, POST_VERTEX);
    const down = createProgram(gl, DOWN_FRAGMENT, POST_VERTEX);
    const up = createProgram(gl, UP_FRAGMENT, POST_VERTEX);
    const composite = createProgram(gl, COMPOSITE_FRAGMENT, POST_VERTEX);
    if (!scene || !down || !up || !composite) {
      if (!scene && process.env.NODE_ENV !== "production") {
        const shader = gl.createShader(gl.FRAGMENT_SHADER);
        if (shader) {
          gl.shaderSource(shader, CURTAIN_FRAGMENT);
          gl.compileShader(shader);
          console.error(gl.getShaderInfoLog(shader));
          gl.deleteShader(shader);
        }
      }
      return null;
    }
    return new CurtainRenderer(canvas, gl, [scene, down, up, composite]);
  }

  private constructor(
    private readonly canvas: HTMLCanvasElement,
    gl: WebGL2RenderingContext,
    programs: [WebGLProgram, WebGLProgram, WebGLProgram, WebGLProgram],
  ) {
    this.gl = gl;
    [this.scene, this.down, this.up, this.composite] = programs;
    this.us = uniforms(gl, this.scene, SCENE);
    this.ud = uniforms(gl, this.down, DOWN);
    this.uu = uniforms(gl, this.up, UP);
    this.uc = uniforms(gl, this.composite, COMPOSITE);
    this.hdr = Boolean(gl.getExtension("EXT_color_buffer_float"));

    this.vao = gl.createVertexArray();
    gl.bindVertexArray(this.vao);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW,
    );
    for (const program of programs) {
      const location = gl.getAttribLocation(program, "aPosition");
      if (location < 0) continue;
      gl.enableVertexAttribArray(location);
      gl.vertexAttribPointer(location, 2, gl.FLOAT, false, 0, 0);
    }
    gl.bindVertexArray(null);

    this.film = this.texture(gl.LINEAR_MIPMAP_LINEAR);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      1,
      1,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      new Uint8Array([0, 0, 0, 255]),
    );
    this.digits = this.texture(gl.LINEAR_MIPMAP_LINEAR);
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

    this.lost = new Promise((resolve) => {
      this.onLost = resolve;
    });
    canvas.addEventListener("webglcontextlost", this.handleLost);
  }

  private readonly handleLost = (event: Event) => {
    event.preventDefault();
    this.onLost();
  };

  private texture(min: number): WebGLTexture {
    const gl = this.gl;
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, min);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return texture;
  }

  // The digits the year is thrown in, set in the display face.
  letter(family: string): void {
    const gl = this.gl;
    if (gl.isContextLost()) return;
    const strip = document.createElement("canvas");
    strip.width = CELL_W;
    strip.height = CELL_H * 11;
    const ctx = strip.getContext("2d");
    if (!ctx) return;
    let size = CELL_H;
    ctx.font = `700 ${size}px ${family}`;
    const sample = ctx.measureText("0");
    const tall =
      sample.actualBoundingBoxAscent + sample.actualBoundingBoxDescent || size;
    const wide = Math.max(
      ...Array.from({ length: 10 }, (_, d) => ctx.measureText(String(d)).width),
    );
    size *= Math.min((CELL_H * 0.84) / tall, (CELL_W * 0.92) / wide);
    ctx.font = `700 ${size}px ${family}`;
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    const metrics = ctx.measureText("0");
    const ascent = metrics.actualBoundingBoxAscent;
    const descent = metrics.actualBoundingBoxDescent;
    for (let i = 0; i < 11; i += 1) {
      const middle = i * CELL_H + CELL_H / 2;
      ctx.fillText(String(i % 10), CELL_W / 2, middle + (ascent - descent) / 2);
    }
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.digits);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, strip);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.activeTexture(gl.TEXTURE0);
  }

  // Puts a film's picture on the screen once it has arrived. A still from
  // the film fills the screen; a poster stands in it, with the dark either
  // side.
  show(index: number, src: string | null, cover: boolean): void {
    if (index === this.wanted) return;
    this.wanted = index;
    const token = ++this.token;
    if (!src) {
      this.shown = index;
      this.filmAt = performance.now();
      this.filmLight = [0.2, 0.17, 0.14];
      this.blank();
      return;
    }
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.decoding = "async";
    image.src = readable(src);
    void image
      .decode()
      .then(() => {
        const gl = this.gl;
        if (this.disposed || gl.isContextLost() || token !== this.token) return;
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.film);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.RGBA,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          image,
        );
        gl.generateMipmap(gl.TEXTURE_2D);
        this.filmSize = [image.naturalWidth, image.naturalHeight];
        this.filmCover = cover;
        this.filmLight = lightOf(image);
        this.filmAt = performance.now();
        this.shown = index;
      })
      .catch(() => {
        if (token !== this.token) return;
        this.shown = index;
        this.filmAt = performance.now();
        this.blank();
      });
  }

  private blank(): void {
    const gl = this.gl;
    if (gl.isContextLost()) return;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.film);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      1,
      1,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      new Uint8Array([0, 0, 0, 255]),
    );
  }

  private make(width: number, height: number): Target {
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

  private release(target: Target | null): void {
    if (!target) return;
    this.gl.deleteFramebuffer(target.fbo);
    this.gl.deleteTexture(target.texture);
  }

  private fit(width: number, height: number): void {
    if (this.target?.width === width && this.target.height === height) return;
    this.release(this.target);
    this.bloom.forEach((level) => this.release(level));
    this.target = this.make(width, height);
    this.bloom = [];
    let w = width;
    let h = height;
    for (let i = 0; i < BLOOM_LEVELS; i += 1) {
      w = Math.max(1, w >> 1);
      h = Math.max(1, h >> 1);
      this.bloom.push(this.make(w, h));
      if (w < 8 || h < 8) break;
    }
  }

  draw(frame: CurtainFrame): void {
    const gl = this.gl;
    if (gl.isContextLost()) return;
    const { height, width } = this.canvas;
    this.fit(width, height);
    const scene = this.target!;
    const { layout } = frame;
    const [sx, sy, shw, shh] = layout.screen;
    const screenAspect = shw / shh;
    const imageAspect = this.filmSize[0] / Math.max(1, this.filmSize[1]);
    const fit: [number, number] = this.filmCover
      ? [
          Math.min(1, screenAspect / imageAspect),
          Math.min(1, imageAspect / screenAspect),
        ]
      : [
          Math.max(1, screenAspect / imageAspect),
          Math.max(1, imageAspect / screenAspect),
        ];
    const fade =
      this.shown >= 0
        ? Math.min(1, (performance.now() - this.filmAt) / FILM_FADE_MS)
        : 0;

    gl.bindVertexArray(this.vao);
    gl.disable(gl.BLEND);
    gl.bindFramebuffer(gl.FRAMEBUFFER, scene.fbo);
    gl.viewport(0, 0, scene.width, scene.height);
    gl.useProgram(this.scene);
    const u = this.us;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.film);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.digits);
    gl.uniform1i(u.uFilm, 0);
    gl.uniform1i(u.uDigits, 1);
    gl.uniform2f(u.uRes, scene.width, scene.height);
    gl.uniform1f(u.uTime, frame.time);
    gl.uniform2f(u.uLook, frame.look.x, frame.look.y);
    gl.uniform4f(u.uStage, layout.half, layout.top, layout.stage, layout.front);
    gl.uniform1f(u.uSeats, layout.seats);
    gl.uniform4f(u.uScreen, sx, sy, shw, shh);
    gl.uniform1f(u.uOpen, frame.open);
    gl.uniform1f(u.uSwing, frame.swing);
    gl.uniform1f(u.uLit, frame.lit);
    const project = frame.project * fade;
    gl.uniform1f(u.uProject, project);
    gl.uniform3f(u.uFilmLight, ...this.filmLight);
    gl.uniform2f(u.uFilmFit, fit[0], fit[1]);
    gl.uniform1f(u.uHover, frame.hover);
    gl.uniform4f(
      u.uYear,
      frame.year[0]!,
      frame.year[1]!,
      frame.year[2]!,
      frame.year[3]!,
    );
    gl.uniform3f(u.uYearAt, ...layout.year);
    gl.uniform1f(u.uYearOn, frame.yearOn);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    // Bloom: halve the frame down a chain, keeping only what is bright at
    // the first step, then add the chain back up.
    gl.useProgram(this.down);
    gl.uniform1i(this.ud.uSource, 0);
    gl.activeTexture(gl.TEXTURE0);
    let source = scene;
    this.bloom.forEach((level, i) => {
      gl.bindFramebuffer(gl.FRAMEBUFFER, level.fbo);
      gl.viewport(0, 0, level.width, level.height);
      gl.bindTexture(gl.TEXTURE_2D, source.texture);
      gl.uniform2f(this.ud.uTexel, 1 / source.width, 1 / source.height);
      gl.uniform1f(this.ud.uThreshold, i === 0 ? (this.hdr ? 0.8 : 0.55) : 0);
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
    gl.uniform1f(c.uBloomAmount, this.hdr ? 0.55 : 0.4);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindVertexArray(null);
  }

  dispose(): void {
    this.disposed = true;
    this.canvas.removeEventListener("webglcontextlost", this.handleLost);
    const gl = this.gl;
    if (gl.isContextLost()) return;
    this.release(this.target);
    this.bloom.forEach((level) => this.release(level));
    gl.deleteTexture(this.film);
    gl.deleteTexture(this.digits);
    gl.deleteVertexArray(this.vao);
    for (const program of [this.scene, this.down, this.up, this.composite]) {
      gl.deleteProgram(program);
    }
  }
}
