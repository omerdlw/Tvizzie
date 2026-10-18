import { bindFullscreen, createProgram, uniforms } from "@/motion/film/gl";
import { decodeOriginal, sizeOf } from "./frames";
import type { WordRaster } from "./glyphs";
import { STRIDE, type Tiles } from "./shatter";
import { GLOW_FRAGMENT, TILE_FRAGMENT, TILE_VERTEX } from "./shatter-shader";

const TILE_NAMES = [
  "uRes",
  "uPx",
  "uDistance",
  "uWordBox",
  "uBand",
  "uAxis",
  "uStart",
  "uSize",
  "uLit",
  "uLight",
  "uCount",
  "uAspect",
  "uIntro",
  "uLanded",
  "uDeep",
  "uLook",
  "uZoom",
  "uInnerLook",
  "uInnerZoom",
  "uTarget",
  "uTargetRect",
  "uTargetLit",
  "uTargetLight",
  "uOutro",
  "uCalm",
  "uCamera",
  "uShutter",
  "uLens",
  "uTrail",
  "uRack",
  "uHalation",
  "uExposure",
  "uTime",
  "uGrain",
  "uFilms",
  "uWord",
] as const;

const GLOW_NAMES = [
  "uRes",
  "uFilms",
  "uBand",
  "uLayers",
  "uLights",
  "uBlend",
  "uGlow",
  "uTime",
  "uGrain",
  "uBackdrop",
] as const;

// Every film is held at one size, in one array, so a single draw can show
// any of them on any tile.
const LAYER = { height: 720, width: 1280 } as const;
const UNIT = { films: 0, word: 1 } as const;
const MAX_FILMS = 10;

type Vec2 = readonly [number, number];
type Vec4 = readonly [number, number, number, number];

export interface ShatterFrame {
  // How much of the dark behind the band is drawn, 0..1; where it is not,
  // what lies under the canvas shows between the tiles.
  backdrop: number;
  // In device pixels: left, top, width, height.
  band: Vec4;
  // 0 lays the slices side by side, 1 one above the other.
  axis: number;
  calm: number;
  // How far the camera has flown into the I, 0..1.
  deep: number;
  // The camera's distance from the screen, in device pixels.
  distance: number;
  exposure: number;
  glow: { band: Vec4; blend: number; layers: Vec2; strength: number };
  grain: number;
  // The camera on the band: the point it looks at and the scale it gives
  // the band, in device pixels. Before the tiles land, what the I looks onto.
  inner: { look: Vec2; zoom: number };
  // Seconds into the tiles coming in.
  intro: number;
  // Whether the tiles have landed in the band, or stand in the word.
  landed: boolean;
  lit: Float32Array;
  outro: number;
  // The film in focus is shot as the film page's hero is: where the camera
  // has leaned to, after the hand, and how far it turned while the shutter
  // was open; where the focus puller's lens is and how far its light is
  // drawn out behind it, in device pixels; how far the focus is pulled to
  // it, 0..1; and how strongly the highlights halate.
  hero: {
    camera: Vec2;
    halation: number;
    lens: Vec2;
    rack: number;
    shutter: Vec2;
    trail: Vec2;
  };
  px: number;
  sizes: Float32Array;
  starts: Float32Array;
  // The film the I opens on, and its slice on the band, in device pixels.
  through: { index: number; rect: Vec4 };
  time: number;
  // The camera the tiles are seen by: the point it looks at and the scale
  // it gives the plane of the screen.
  view: { look: Vec2; zoom: number };
  word: Vec4;
}

interface Film {
  abort: AbortController | null;
  arrived: number;
  pending: ImageBitmap | HTMLImageElement | null;
  source: string | undefined;
  state: "idle" | "loading" | "decoded" | "ready" | "failed";
}

export class ShatterRenderer {
  readonly lost: Promise<void>;
  private readonly gl: WebGL2RenderingContext;
  private readonly tile: WebGLProgram;
  private readonly glow: WebGLProgram;
  private readonly tu: Record<
    (typeof TILE_NAMES)[number],
    WebGLUniformLocation | null
  >;
  private readonly gu: Record<
    (typeof GLOW_NAMES)[number],
    WebGLUniformLocation | null
  >;
  private readonly tileVao: WebGLVertexArrayObject;
  private readonly glowVao: WebGLVertexArrayObject;
  private readonly instances: WebGLBuffer;
  private readonly array: WebGLTexture;
  private word: WebGLTexture | null = null;
  private readonly films: Film[];
  private readonly lights = new Float32Array(MAX_FILMS);
  private count = 0;
  private disposed = false;
  private onLost: () => void = () => {};

  static create(
    canvas: HTMLCanvasElement,
    sources: readonly (string | undefined)[],
  ): ShatterRenderer | null {
    const gl = canvas.getContext("webgl2", {
      // The corridor is behind the band as it bursts, seen past its tiles.
      alpha: true,
      antialias: true,
      depth: true,
      powerPreference: "high-performance",
      premultipliedAlpha: true,
      stencil: false,
    });
    if (!gl) return null;
    const tile = createProgram(gl, TILE_FRAGMENT, TILE_VERTEX);
    const glow = createProgram(gl, GLOW_FRAGMENT);
    if (!tile || !glow) return null;
    return new ShatterRenderer(canvas, gl, tile, glow, sources);
  }

  private constructor(
    private readonly canvas: HTMLCanvasElement,
    gl: WebGL2RenderingContext,
    tile: WebGLProgram,
    glow: WebGLProgram,
    sources: readonly (string | undefined)[],
  ) {
    this.gl = gl;
    this.tile = tile;
    this.glow = glow;
    this.tu = uniforms(gl, tile, TILE_NAMES);
    this.gu = uniforms(gl, glow, GLOW_NAMES);

    this.glowVao = gl.createVertexArray();
    gl.bindVertexArray(this.glowVao);
    bindFullscreen(gl, glow);

    this.tileVao = gl.createVertexArray();
    gl.bindVertexArray(this.tileVao);
    const corners = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, corners);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-0.5, -0.5, 0.5, -0.5, -0.5, 0.5, 0.5, 0.5]),
      gl.STATIC_DRAW,
    );
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    this.instances = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.instances);
    for (let i = 0; i < 3; i += 1) {
      gl.enableVertexAttribArray(1 + i);
      gl.vertexAttribPointer(1 + i, 4, gl.FLOAT, false, STRIDE * 4, i * 16);
      gl.vertexAttribDivisor(1 + i, 1);
    }
    gl.bindVertexArray(null);

    const layers = Math.max(1, Math.min(MAX_FILMS, sources.length));
    this.array = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, this.array);
    const levels =
      Math.floor(Math.log2(Math.max(LAYER.width, LAYER.height))) + 1;
    gl.texStorage3D(
      gl.TEXTURE_2D_ARRAY,
      levels,
      gl.RGBA8,
      LAYER.width,
      LAYER.height,
      layers,
    );
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(
      gl.TEXTURE_2D_ARRAY,
      gl.TEXTURE_MIN_FILTER,
      gl.LINEAR_MIPMAP_LINEAR,
    );
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    gl.useProgram(tile);
    gl.uniform1i(this.tu.uFilms, UNIT.films);
    gl.uniform1i(this.tu.uWord, UNIT.word);
    gl.useProgram(glow);
    gl.uniform1i(this.gu.uFilms, UNIT.films);

    this.films = sources.slice(0, MAX_FILMS).map((source) => ({
      abort: null,
      arrived: 0,
      pending: null,
      source,
      state: source ? "idle" : "failed",
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

  setWord(raster: WordRaster): void {
    const gl = this.gl;
    if (this.word) gl.deleteTexture(this.word);
    this.word = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.word);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      raster.canvas,
    );
  }

  setTiles(tiles: Tiles): void {
    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.instances);
    gl.bufferData(gl.ARRAY_BUFFER, tiles.data, gl.STATIC_DRAW);
    this.count = tiles.count;
  }

  ready(index: number): boolean {
    return this.films[index]?.state === "ready";
  }

  // Whether every film has come in, or given up.
  get settled(): boolean {
    return this.films.every(
      (film) => film.state === "ready" || film.state === "failed",
    );
  }

  // Loads every film, and puts at most one on the GPU a frame, so a frame
  // never stutters for it. Returns whether anything changed.
  pump(): boolean {
    let uploaded = false;
    this.films.forEach((film, index) => {
      if (film.state === "idle") this.load(film);
      if (film.state === "decoded" && !uploaded) {
        uploaded = true;
        this.upload(film, index);
      }
    });
    return uploaded;
  }

  // How far each film has come up since it arrived, 0..1; whether any is
  // still coming up.
  light(now: number, fade: number): boolean {
    let rising = false;
    this.films.forEach((film, index) => {
      const value =
        film.state === "ready"
          ? Math.min(1, (now - film.arrived) / Math.max(1, fade))
          : 0;
      this.lights[index] = 1 - (1 - value) ** 3;
      if (film.state === "ready" && value < 1) rising = true;
    });
    return rising;
  }

  private load(film: Film): void {
    if (!film.source) return;
    const abort = new AbortController();
    film.abort = abort;
    film.state = "loading";
    void decodeOriginal(film.source, LAYER.width, abort.signal)
      .then(async (picture) => {
        if (!picture) return null;
        const { height, width } = sizeOf(picture);
        if (width === LAYER.width && height === LAYER.height) return picture;
        try {
          const fitted = await createImageBitmap(picture, {
            resizeHeight: LAYER.height,
            resizeQuality: "high",
            resizeWidth: LAYER.width,
          });
          if (picture instanceof ImageBitmap) picture.close();
          return fitted;
        } catch {
          return null;
        }
      })
      .then((picture) => {
        if (abort.signal.aborted || this.disposed) {
          if (picture instanceof ImageBitmap) picture.close();
          return;
        }
        film.abort = null;
        if (!picture) {
          film.state = "failed";
          return;
        }
        film.pending = picture;
        film.state = "decoded";
      });
  }

  private upload(film: Film, index: number): void {
    const gl = this.gl;
    const picture = film.pending;
    if (!picture) return;
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, this.array);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texSubImage3D(
      gl.TEXTURE_2D_ARRAY,
      0,
      0,
      0,
      index,
      LAYER.width,
      LAYER.height,
      1,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      picture,
    );
    gl.generateMipmap(gl.TEXTURE_2D_ARRAY);
    if (picture instanceof ImageBitmap) picture.close();
    film.pending = null;
    film.arrived = performance.now();
    film.state = "ready";
  }

  draw(frame: ShatterFrame): void {
    const gl = this.gl;
    if (gl.isContextLost()) return;
    const { height, width } = this.canvas;
    gl.viewport(0, 0, width, height);
    gl.clearColor(0, 0, 0, 0);
    gl.clearDepth(1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.activeTexture(gl.TEXTURE0 + UNIT.films);
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, this.array);
    gl.activeTexture(gl.TEXTURE0 + UNIT.word);
    gl.bindTexture(gl.TEXTURE_2D, this.word);

    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);
    gl.useProgram(this.glow);
    gl.bindVertexArray(this.glowVao);
    const g = this.gu;
    const [layerA, layerB] = frame.glow.layers;
    gl.uniform2f(g.uRes, width, height);
    gl.uniform4f(g.uBand, ...frame.glow.band);
    gl.uniform2f(g.uLayers, layerA, layerB);
    gl.uniform2f(g.uLights, this.lights[layerA] ?? 0, this.lights[layerB] ?? 0);
    gl.uniform1f(g.uBlend, frame.glow.blend);
    gl.uniform1f(g.uGlow, frame.glow.strength * frame.exposure);
    gl.uniform1f(g.uTime, frame.time);
    gl.uniform1f(g.uGrain, frame.grain);
    gl.uniform1f(g.uBackdrop, frame.backdrop);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    if (!this.word || this.count === 0) return;

    gl.useProgram(this.tile);
    gl.bindVertexArray(this.tileVao);
    const u = this.tu;
    gl.uniform2f(u.uRes, width, height);
    gl.uniform1f(u.uPx, frame.px);
    gl.uniform1f(u.uDistance, frame.distance);
    gl.uniform4f(u.uWordBox, ...frame.word);
    gl.uniform4f(u.uBand, ...frame.band);
    gl.uniform1f(u.uAxis, frame.axis);
    gl.uniform1fv(u.uStart, frame.starts);
    gl.uniform1fv(u.uSize, frame.sizes);
    gl.uniform1fv(u.uLit, frame.lit);
    gl.uniform1fv(u.uLight, this.lights);
    gl.uniform1f(u.uCount, Math.max(1, this.films.length));
    gl.uniform1f(u.uAspect, LAYER.width / LAYER.height);
    gl.uniform1f(u.uIntro, frame.intro);
    gl.uniform1f(u.uLanded, frame.landed ? 1 : 0);
    gl.uniform1f(u.uDeep, frame.deep);
    gl.uniform2f(u.uLook, ...frame.view.look);
    gl.uniform1f(u.uZoom, frame.view.zoom);
    gl.uniform2f(u.uInnerLook, ...frame.inner.look);
    gl.uniform1f(u.uInnerZoom, frame.inner.zoom);
    const through = frame.through.index;
    gl.uniform1f(u.uTarget, through);
    gl.uniform4f(u.uTargetRect, ...frame.through.rect);
    gl.uniform1f(u.uTargetLit, frame.lit[through] ?? 1);
    gl.uniform1f(u.uTargetLight, this.lights[through] ?? 0);
    gl.uniform1f(u.uOutro, frame.outro);
    gl.uniform1f(u.uCalm, frame.calm);
    gl.uniform2f(u.uCamera, ...frame.hero.camera);
    gl.uniform2f(u.uShutter, ...frame.hero.shutter);
    gl.uniform2f(u.uLens, ...frame.hero.lens);
    gl.uniform2f(u.uTrail, ...frame.hero.trail);
    gl.uniform1f(u.uRack, frame.hero.rack);
    gl.uniform1f(u.uHalation, frame.hero.halation);
    gl.uniform1f(u.uExposure, frame.exposure);
    gl.uniform1f(u.uTime, frame.time);
    gl.uniform1f(u.uGrain, frame.grain);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, this.count);
    gl.bindVertexArray(null);
  }

  dispose(): void {
    this.disposed = true;
    this.canvas.removeEventListener("webglcontextlost", this.handleLost);
    this.films.forEach((film) => {
      film.abort?.abort();
      if (film.pending instanceof ImageBitmap) film.pending.close();
      film.pending = null;
    });
    const gl = this.gl;
    if (gl.isContextLost()) return;
    gl.deleteTexture(this.array);
    if (this.word) gl.deleteTexture(this.word);
    gl.deleteBuffer(this.instances);
    gl.deleteVertexArray(this.tileVao);
    gl.deleteVertexArray(this.glowVao);
    gl.deleteProgram(this.tile);
    gl.deleteProgram(this.glow);
  }
}
