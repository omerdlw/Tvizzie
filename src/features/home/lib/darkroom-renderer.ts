import { createProgram, readable, uniforms } from "@/motion/film/gl";
import {
  ATLAS_COLUMNS,
  ATLAS_ROWS,
  MAX_PRINTS,
  PORTRAIT_ASPECT,
  type RoomLayout,
} from "./darkroom";
import {
  DARKROOM_FRAGMENT,
  DUST_FRAGMENT,
  DUST_VERTEX,
} from "./darkroom-shader";
import {
  compositeFragment,
  DOWN_FRAGMENT,
  POST_VERTEX,
  UP_FRAGMENT,
} from "./tunnel-shader";

const SHARED = [
  "uRes",
  "uTime",
  "uLit",
  "uLens",
  "uLamp",
  "uLine",
  "uRow",
  "uPrint",
  "uForm",
  "uCount",
  "uSwing",
  "uAtlas",
  "uCells",
] as const;
const SCENE = [
  ...SHARED,
  "uTray",
  "uSheet",
  "uPortrait",
  "uWas",
  "uPortraitFit",
  "uWasFit",
  "uDevelop",
  "uWasDevelop",
  "uHasNow",
  "uHasWas",
  "uWave",
  "uInspect",
] as const;
const DUST = SHARED;
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
// A print's picture in the atlas, in texels.
const SLOT = {
  posters: [168, 252],
  stills: [320, 180],
} as const;
const PICTURE_FADE_MS = 450;

export interface DarkroomFrame {
  develop: number;
  exposure: number;
  // How far each print has come together.
  form: Float32Array;
  grain: number;
  // The print under the inspection lamp, or -1, and how far the lamp is up.
  inspect: [number, number];
  layout: RoomLayout;
  lit: number;
  // How far the line is drawn along, in directors.
  place: number;
  prints: number;
  swing: number;
  time: number;
  wasDevelop: number;
  wave: number;
}

interface Target {
  fbo: WebGLFramebuffer;
  height: number;
  texture: WebGLTexture;
  width: number;
}

function load(src: string | null): Promise<HTMLImageElement | null> {
  if (!src) return Promise.resolve(null);
  const image = new Image();
  image.crossOrigin = "anonymous";
  image.decoding = "async";
  image.src = readable(src);
  return image
    .decode()
    .then(() => image)
    .catch(() => null);
}

// Draws a picture over a box, cropping it to fill.
function cover(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  w: number,
  h: number,
): void {
  const scale = Math.max(w / image.naturalWidth, h / image.naturalHeight);
  const sw = w / scale;
  const sh = h / scale;
  ctx.drawImage(
    image,
    (image.naturalWidth - sw) / 2,
    (image.naturalHeight - sh) / 2,
    sw,
    sh,
    0,
    0,
    w,
    h,
  );
}

export class DarkroomRenderer {
  readonly lost: Promise<void>;
  private readonly gl: WebGL2RenderingContext;
  private readonly scene: WebGLProgram;
  private readonly dust: WebGLProgram;
  private readonly down: WebGLProgram;
  private readonly up: WebGLProgram;
  private readonly composite: WebGLProgram;
  private readonly us: Locations<typeof SCENE>;
  private readonly uds: Locations<typeof DUST>;
  private readonly ud: Locations<typeof DOWN>;
  private readonly uu: Locations<typeof UP>;
  private readonly uc: Locations<typeof COMPOSITE>;
  private readonly vao: WebGLVertexArrayObject;
  private readonly bare: WebGLVertexArrayObject;
  private readonly hdr: boolean;
  // The portrait on the sheet and the one before it, each with whether it
  // is a sheet at all and its size.
  private portraits: [WebGLTexture, WebGLTexture];
  private sheets: [boolean, boolean] = [false, false];
  private sizes: [[number, number], [number, number]] = [
    [2, 3],
    [2, 3],
  ];
  private readonly atlas: WebGLTexture;
  private atlasPosters: boolean | null = null;
  private atlasDirty = false;
  private readonly asked = new Set<number>();
  private target: Target | null = null;
  private bloom: Target[] = [];
  private wanted = "";
  private token = 0;
  private disposed = false;
  private onLost: () => void = () => {};
  // When each print's picture arrived, or 0 while it has not.
  readonly arrived = new Float64Array(MAX_PRINTS);
  // The sheet on show, by the key it was asked for under, and when it came.
  shown = "";
  shownAt = 0;

  static create(canvas: HTMLCanvasElement): DarkroomRenderer | null {
    const gl = canvas.getContext("webgl2", {
      alpha: false,
      antialias: false,
      depth: false,
      powerPreference: "high-performance",
      premultipliedAlpha: false,
      stencil: false,
    });
    if (!gl) return null;
    const scene = createProgram(gl, DARKROOM_FRAGMENT, POST_VERTEX);
    const dust = createProgram(gl, DUST_FRAGMENT, DUST_VERTEX);
    const down = createProgram(gl, DOWN_FRAGMENT, POST_VERTEX);
    const up = createProgram(gl, UP_FRAGMENT, POST_VERTEX);
    // The dust would be split into three by the usual fringe.
    const composite = createProgram(gl, compositeFragment(0.0015), POST_VERTEX);
    if (!scene || !dust || !down || !up || !composite) {
      if (process.env.NODE_ENV !== "production") {
        for (const [type, source] of [
          [gl.FRAGMENT_SHADER, DARKROOM_FRAGMENT],
          [gl.VERTEX_SHADER, DUST_VERTEX],
          [gl.FRAGMENT_SHADER, DUST_FRAGMENT],
        ] as const) {
          const shader = gl.createShader(type);
          if (!shader) continue;
          gl.shaderSource(shader, source);
          gl.compileShader(shader);
          const log = gl.getShaderInfoLog(shader);
          if (log) console.error(log);
          gl.deleteShader(shader);
        }
      }
      return null;
    }
    return new DarkroomRenderer(canvas, gl, [scene, dust, down, up, composite]);
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
  ) {
    this.gl = gl;
    [this.scene, this.dust, this.down, this.up, this.composite] = programs;
    this.us = uniforms(gl, this.scene, SCENE);
    this.uds = uniforms(gl, this.dust, DUST);
    this.ud = uniforms(gl, this.down, DOWN);
    this.uu = uniforms(gl, this.up, UP);
    this.uc = uniforms(gl, this.composite, COMPOSITE);
    this.hdr = Boolean(gl.getExtension("EXT_color_buffer_float"));

    // One triangle over the screen for the full-screen passes. The dust is
    // drawn without any attribute: each grain is known by its vertex id.
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
    this.bare = gl.createVertexArray();

    this.portraits = [this.pixel(), this.pixel()];
    this.atlas = this.pixel();

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

  // A texture of one pale pixel: blank paper.
  private pixel(): WebGLTexture {
    const gl = this.gl;
    const texture = this.texture(gl.LINEAR_MIPMAP_LINEAR);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      1,
      1,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      new Uint8Array([235, 235, 235, 255]),
    );
    gl.generateMipmap(gl.TEXTURE_2D);
    return texture;
  }

  // The atlas, cleared to the dark of an unprinted sheet, sized for posters
  // or for stills. Changing between them starts the prints again.
  private resetAtlas(posters: boolean): void {
    const gl = this.gl;
    const [w, h] = posters ? SLOT.posters : SLOT.stills;
    const width = w * ATLAS_COLUMNS;
    const height = h * ATLAS_ROWS;
    const blank = document.createElement("canvas");
    blank.width = width;
    blank.height = height;
    const ctx = blank.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#1a1a1a";
      ctx.fillRect(0, 0, width, height);
    }
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.atlas);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, blank);
    gl.generateMipmap(gl.TEXTURE_2D);
    this.atlasPosters = posters;
    this.asked.clear();
    this.arrived.fill(0);
  }

  // Fetches the pictures for prints that are not yet in the atlas.
  prints(sources: readonly (string | null)[], posters: boolean): void {
    const gl = this.gl;
    if (gl.isContextLost()) return;
    if (this.atlasPosters !== posters) this.resetAtlas(posters);
    const [w, h] = posters ? SLOT.posters : SLOT.stills;
    sources.forEach((src, i) => {
      if (i >= MAX_PRINTS || this.asked.has(i)) return;
      this.asked.add(i);
      void load(src).then((image) => {
        if (this.disposed || gl.isContextLost()) return;
        if (this.atlasPosters !== posters) return;
        if (image) {
          const slot = document.createElement("canvas");
          slot.width = w;
          slot.height = h;
          const ctx = slot.getContext("2d");
          if (!ctx) return;
          cover(ctx, image, w, h);
          gl.activeTexture(gl.TEXTURE0);
          gl.bindTexture(gl.TEXTURE_2D, this.atlas);
          gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
          gl.texSubImage2D(
            gl.TEXTURE_2D,
            0,
            (i % ATLAS_COLUMNS) * w,
            Math.floor(i / ATLAS_COLUMNS) * h,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            slot,
          );
          this.atlasDirty = true;
        }
        this.arrived[i] = performance.now();
      });
    });
  }

  // How far print i's picture has faded in since it arrived.
  ready(i: number, now: number): number {
    const at = this.arrived[i] ?? 0;
    if (!at) return 0;
    return Math.min(1, (now - at) / PICTURE_FADE_MS);
  }

  // Puts a sheet in the tray once its portrait has arrived, or takes the
  // sheet out when there is no portrait. The one before it is kept, for
  // the bath to wash away.
  sheet(key: string, src: string | null): void {
    if (key === this.wanted) return;
    this.wanted = key;
    const token = ++this.token;
    const put = (image: HTMLImageElement | null, has: boolean) => {
      const gl = this.gl;
      if (this.disposed || gl.isContextLost() || token !== this.token) return;
      this.portraits = [this.portraits[1], this.portraits[0]];
      this.sheets = [has, this.sheets[0]];
      this.sizes = [this.sizes[1], this.sizes[0]];
      if (image) {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.portraits[0]);
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
        this.sizes[0] = [image.naturalWidth, image.naturalHeight];
      }
      this.shown = key;
      this.shownAt = performance.now();
    };
    if (!src) {
      put(null, false);
      return;
    }
    void load(src).then((image) => put(image, Boolean(image)));
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

  // How a portrait is fitted to the picture on the sheet: cropped to fill.
  private fitOf([w, h]: [number, number]): [number, number] {
    const image = w / Math.max(1, h);
    return [
      Math.min(1, PORTRAIT_ASPECT / image),
      Math.min(1, image / PORTRAIT_ASPECT),
    ];
  }

  // The uniforms both the room and the dust read.
  private shared(
    u: Locations<typeof SHARED>,
    frame: DarkroomFrame,
    width: number,
    height: number,
  ): void {
    const gl = this.gl;
    const { layout } = frame;
    gl.uniform2f(u.uRes, width, height);
    gl.uniform1f(u.uTime, frame.time);
    gl.uniform1f(u.uLit, frame.lit);
    gl.uniform3f(u.uLens, layout.focal, layout.horizon, layout.wall);
    gl.uniform4f(u.uLamp, ...layout.lamp);
    gl.uniform2f(u.uLine, ...layout.line);
    gl.uniform4f(
      u.uRow,
      layout.pitch,
      layout.group,
      frame.place,
      layout.border,
    );
    gl.uniform2f(u.uPrint, ...layout.print);
    gl.uniform1fv(u.uForm, frame.form);
    gl.uniform1f(u.uCount, frame.prints);
    gl.uniform1f(u.uSwing, frame.swing);
    gl.uniform1i(u.uAtlas, 2);
    gl.uniform2f(u.uCells, ...layout.cells);
  }

  draw(frame: DarkroomFrame): void {
    const gl = this.gl;
    if (gl.isContextLost()) return;
    const { height, width } = this.canvas;
    this.fit(width, height);
    const scene = this.target!;
    const { layout } = frame;

    if (this.atlasDirty) {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.atlas);
      gl.generateMipmap(gl.TEXTURE_2D);
      this.atlasDirty = false;
    }

    gl.bindVertexArray(this.vao);
    gl.disable(gl.BLEND);
    gl.bindFramebuffer(gl.FRAMEBUFFER, scene.fbo);
    gl.viewport(0, 0, scene.width, scene.height);
    [this.portraits[0], this.portraits[1], this.atlas].forEach((texture, i) => {
      gl.activeTexture(gl.TEXTURE0 + i);
      gl.bindTexture(gl.TEXTURE_2D, texture);
    });

    gl.useProgram(this.scene);
    const u = this.us;
    this.shared(u, frame, scene.width, scene.height);
    gl.uniform1i(u.uPortrait, 0);
    gl.uniform1i(u.uWas, 1);
    gl.uniform4f(u.uTray, ...layout.tray);
    gl.uniform4f(u.uSheet, ...layout.sheet);
    gl.uniform2f(u.uPortraitFit, ...this.fitOf(this.sizes[0]));
    gl.uniform2f(u.uWasFit, ...this.fitOf(this.sizes[1]));
    gl.uniform1f(u.uDevelop, frame.develop);
    gl.uniform1f(u.uWasDevelop, frame.wasDevelop);
    gl.uniform1f(u.uHasNow, this.sheets[0] ? 1 : 0);
    gl.uniform1f(u.uHasWas, this.sheets[1] ? 1 : 0);
    gl.uniform1f(u.uWave, frame.wave);
    gl.uniform2f(u.uInspect, ...frame.inspect);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    // The dust, over the room: only the prints that are on their way are
    // drawn, the rest of their grains are thrown out in the vertex stage.
    const cells = layout.cells[0] * layout.cells[1];
    let first = -1;
    let last = -1;
    for (let i = 0; i < frame.prints; i += 1) {
      const form = frame.form[i]!;
      if (form <= 0 || form >= 0.999) continue;
      if (first < 0) first = i;
      last = i;
    }
    if (first >= 0) {
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.useProgram(this.dust);
      this.shared(this.uds, frame, scene.width, scene.height);
      gl.bindVertexArray(this.bare);
      gl.drawArrays(gl.POINTS, first * cells, (last - first + 1) * cells);
      gl.bindVertexArray(this.vao);
      gl.disable(gl.BLEND);
    }

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
    gl.uniform1f(c.uBloomAmount, this.hdr ? 0.6 : 0.45);
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
    for (const texture of [...this.portraits, this.atlas]) {
      gl.deleteTexture(texture);
    }
    gl.deleteVertexArray(this.vao);
    gl.deleteVertexArray(this.bare);
    for (const program of [
      this.scene,
      this.dust,
      this.down,
      this.up,
      this.composite,
    ]) {
      gl.deleteProgram(program);
    }
  }
}
