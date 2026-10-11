import { bindFullscreen, createProgram, uniforms } from "@/motion/film/gl";
import { decodeOriginal, sizeOf } from "./frames";
import type { WordRaster } from "./glyphs";
import { OPENING_FRAGMENT } from "./opening-shader";

const NAMES = [
  "uRes",
  "uTime",
  "uPointer",
  "uVelocity",
  "uWord",
  "uWordBox",
  "uEdges",
  "uRise",
  "uParallax",
  "uFocal",
  "uFocalTo",
  "uShift",
  "uZoom",
  "uFrame",
  "uRadius",
  "uReeds",
  "uImgA",
  "uImgB",
  "uSizeA",
  "uSizeB",
  "uLight",
  "uMix",
  "uImgZoom",
  "uMode",
  "uFlood",
  "uRoom",
  "uExposure",
  "uGrain",
] as const;

const UNIT = { filmA: 1, filmB: 2, word: 0 } as const;
// Films kept on the GPU on either side of the ones being drawn.
const AHEAD = 2;
const BEHIND = 1;

type Vec2 = readonly [number, number];
type Vec4 = readonly [number, number, number, number];

export interface OpeningFrame {
  exposure: number;
  filmA: number;
  filmB: number;
  flood: number;
  frame: Vec4;
  grain: number;
  imgZoom: number;
  mix: number;
  mode: number;
  pointer: Vec2;
  radius: number;
  reeds: number;
  room: number;
  time: number;
  velocity: number;
  word: {
    box: Vec4;
    focal: Vec2;
    focalTo: Vec2;
    parallax: number;
    rise: readonly number[];
    shift: number;
    zoom: number;
  };
}

interface Film {
  abort: AbortController | null;
  // When the picture first reached the GPU, for its fade up.
  arrived: number;
  pending: ImageBitmap | HTMLImageElement | null;
  size: [number, number];
  // A quick, smaller picture first, then the full one.
  sources: readonly string[];
  stage: number;
  state: "idle" | "loading" | "decoded" | "ready" | "failed";
  texture: WebGLTexture | null;
}

export class OpeningRenderer {
  readonly lost: Promise<void>;
  private readonly gl: WebGL2RenderingContext;
  private readonly u: Record<
    (typeof NAMES)[number],
    WebGLUniformLocation | null
  >;
  private readonly films: Film[];
  private readonly blank: WebGLTexture;
  private word: WebGLTexture;
  private readonly longest: (index: number) => number;
  private disposed = false;
  private onLost: () => void = () => {};

  static create(
    canvas: HTMLCanvasElement,
    sources: readonly (readonly string[])[],
    longest: (index: number) => number,
  ): OpeningRenderer | null {
    const gl = canvas.getContext("webgl2", {
      alpha: false,
      antialias: false,
      depth: false,
      powerPreference: "high-performance",
      premultipliedAlpha: false,
      stencil: false,
    });
    if (!gl) return null;
    const program = createProgram(gl, OPENING_FRAGMENT);
    if (!program) return null;
    return new OpeningRenderer(canvas, gl, program, sources, longest);
  }

  private constructor(
    private readonly canvas: HTMLCanvasElement,
    gl: WebGL2RenderingContext,
    program: WebGLProgram,
    sources: readonly (readonly string[])[],
    longest: (index: number) => number,
  ) {
    this.gl = gl;
    this.longest = longest;
    gl.useProgram(program);
    bindFullscreen(gl, program);
    this.u = uniforms(gl, program, NAMES);
    gl.uniform1i(this.u.uWord, UNIT.word);
    gl.uniform1i(this.u.uImgA, UNIT.filmA);
    gl.uniform1i(this.u.uImgB, UNIT.filmB);

    this.blank = this.texture();
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      1,
      1,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      new Uint8Array([0, 0, 0, 0]),
    );
    this.word = this.blank;
    this.films = sources.map((list) => ({
      abort: null,
      arrived: 0,
      pending: null,
      size: [16, 9],
      sources: list,
      stage: 0,
      state: "idle",
      texture: null,
    }));

    this.lost = new Promise((resolve) => {
      this.onLost = resolve;
    });
    canvas.addEventListener("webglcontextlost", this.handleLost);
  }

  get maxTexture(): number {
    return this.gl.getParameter(this.gl.MAX_TEXTURE_SIZE) as number;
  }

  private readonly handleLost = (event: Event) => {
    event.preventDefault();
    this.onLost();
  };

  private texture(): WebGLTexture {
    const gl = this.gl;
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    return texture;
  }

  setWord(raster: WordRaster): void {
    const gl = this.gl;
    if (this.word !== this.blank) gl.deleteTexture(this.word);
    this.word = this.texture();
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      raster.canvas,
    );
    const edges = new Float32Array(8).fill(1);
    raster.edges.slice(0, 8).forEach((edge, i) => (edges[i] = edge));
    gl.uniform1fv(this.u.uEdges, edges);
  }

  // How far a film has come up since it arrived, 0..1.
  light(index: number, now: number, fade: number): number {
    const film = this.films[index];
    if (!film?.texture) return 0;
    return Math.min(1, (now - film.arrived) / fade);
  }

  ready(index: number): boolean {
    return Boolean(this.films[index]?.texture);
  }

  // Keeps the films near `around` loaded and on the GPU, and lets the rest go.
  // At most one picture is uploaded per frame, so a pass never stutters.
  keep(around: readonly number[]): void {
    const low = Math.min(...around) - BEHIND;
    const high = Math.max(...around) + AHEAD;
    let uploaded = false;

    this.films.forEach((film, index) => {
      if (index < low || index > high) {
        this.release(film);
        return;
      }
      if (film.state === "idle") this.load(film, index);
      if (film.state === "decoded" && !uploaded) {
        uploaded = true;
        this.upload(film, index);
      }
    });
  }

  private load(film: Film, index: number): void {
    const src = film.sources[film.stage];
    if (!src) return;
    const abort = new AbortController();
    film.abort = abort;
    film.state = "loading";
    void decodeOriginal(src, this.longest(index), abort.signal).then(
      (picture) => {
        if (abort.signal.aborted || this.disposed) {
          if (picture instanceof ImageBitmap) picture.close();
          return;
        }
        film.abort = null;
        if (!picture) {
          film.state = film.texture ? "ready" : "failed";
          return;
        }
        film.pending = picture;
        film.state = "decoded";
      },
    );
  }

  private upload(film: Film, index: number): void {
    const gl = this.gl;
    const picture = film.pending;
    if (!picture) return;
    const texture = this.texture();
    gl.texParameteri(
      gl.TEXTURE_2D,
      gl.TEXTURE_MIN_FILTER,
      gl.LINEAR_MIPMAP_LINEAR,
    );
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      picture,
    );
    gl.generateMipmap(gl.TEXTURE_2D);
    const { height, width } = sizeOf(picture);
    if (picture instanceof ImageBitmap) picture.close();
    film.pending = null;
    if (film.texture) gl.deleteTexture(film.texture);
    else film.arrived = performance.now();
    film.texture = texture;
    film.size = [width, height];
    film.state = "ready";

    if (film.stage + 1 < film.sources.length) {
      film.stage += 1;
      this.load(film, index);
    }
  }

  private release(film: Film): void {
    film.abort?.abort();
    film.abort = null;
    if (film.pending instanceof ImageBitmap) film.pending.close();
    film.pending = null;
    if (film.texture) this.gl.deleteTexture(film.texture);
    film.texture = null;
    film.stage = 0;
    if (film.state !== "failed") film.state = "idle";
  }

  private bind(unit: number, texture: WebGLTexture) {
    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, texture);
  }

  draw(frame: OpeningFrame, light: Vec2): void {
    const gl = this.gl;
    const u = this.u;
    if (gl.isContextLost()) return;
    const { height, width } = this.canvas;
    gl.viewport(0, 0, width, height);

    const filmA = this.films[frame.filmA];
    const filmB = this.films[frame.filmB];
    this.bind(UNIT.word, this.word);
    this.bind(UNIT.filmA, filmA?.texture ?? this.blank);
    this.bind(UNIT.filmB, filmB?.texture ?? this.blank);

    gl.uniform2f(u.uRes, width, height);
    gl.uniform1f(u.uTime, frame.time);
    gl.uniform2f(u.uPointer, frame.pointer[0], frame.pointer[1]);
    gl.uniform1f(u.uVelocity, frame.velocity);

    const word = frame.word;
    gl.uniform4f(u.uWordBox, ...word.box);
    gl.uniform1fv(u.uRise, Float32Array.from(word.rise));
    gl.uniform1f(u.uParallax, word.parallax);
    gl.uniform2f(u.uFocal, word.focal[0], word.focal[1]);
    gl.uniform2f(u.uFocalTo, word.focalTo[0], word.focalTo[1]);
    gl.uniform1f(u.uShift, word.shift);
    gl.uniform1f(u.uZoom, word.zoom);

    gl.uniform4f(u.uFrame, ...frame.frame);
    gl.uniform1f(u.uRadius, frame.radius);
    gl.uniform1f(u.uReeds, frame.reeds);

    gl.uniform2f(u.uSizeA, ...(filmA?.size ?? [16, 9]));
    gl.uniform2f(u.uSizeB, ...(filmB?.size ?? [16, 9]));
    gl.uniform2f(u.uLight, light[0], light[1]);
    gl.uniform1f(u.uMix, frame.mix);
    gl.uniform1f(u.uImgZoom, frame.imgZoom);
    gl.uniform1f(u.uMode, frame.mode);
    gl.uniform1f(u.uFlood, frame.flood);
    gl.uniform1f(u.uRoom, frame.room);
    gl.uniform1f(u.uExposure, frame.exposure);
    gl.uniform1f(u.uGrain, frame.grain);

    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  dispose(): void {
    this.disposed = true;
    this.canvas.removeEventListener("webglcontextlost", this.handleLost);
    this.films.forEach((film) => this.release(film));
    const gl = this.gl;
    if (gl.isContextLost()) return;
    if (this.word !== this.blank) gl.deleteTexture(this.word);
    gl.deleteTexture(this.blank);
  }
}
