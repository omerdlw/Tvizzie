import { createProgram, readable, uniforms } from "@/motion/film/gl";
import type { Camera } from "./tunnel-camera";
import type { Poster } from "./tunnel-scene";
import { POSTER_FRAGMENT, POSTER_VERTEX, WALL_FRAGMENT } from "./tunnel-shader";

const WALL = [
  "uRes",
  "uCam",
  "uRight",
  "uUp",
  "uBack",
  "uTanH",
  "uAspect",
  "uTime",
  "uGate",
  "uVelocity",
  "uExposure",
  "uGrain",
  "uWarm",
  "uCool",
] as const;

const POSTER = [
  "uViewProj",
  "uCenter",
  "uSize",
  "uYaw",
  "uAtlas",
  "uCell",
  "uCam",
  "uLoaded",
  "uHover",
  "uTint",
  "uExposure",
] as const;

// Every poster gets a cell of one atlas, so a frame binds a single texture.
const CELL_W = 400;
const CELL_H = 600;
const COLUMNS = 5;
const FADE_MS = 700;

export const WARM: [number, number, number] = [1, 0.6, 0.3];
export const COOL: [number, number, number] = [0.42, 0.7, 1];

export interface TunnelFrame {
  camera: Camera;
  exposure: number;
  gate: number;
  grain: number;
  hover: readonly number[];
  time: number;
  velocity: number;
}

interface Slot {
  arrived: number;
  ready: boolean;
}

export class TunnelRenderer {
  readonly lost: Promise<void>;
  private readonly gl: WebGL2RenderingContext;
  private readonly wall: WebGLProgram;
  private readonly poster: WebGLProgram;
  private readonly uw: Record<
    (typeof WALL)[number],
    WebGLUniformLocation | null
  >;
  private readonly up: Record<
    (typeof POSTER)[number],
    WebGLUniformLocation | null
  >;
  private readonly wallVao: WebGLVertexArrayObject;
  private readonly quadVao: WebGLVertexArrayObject;
  private readonly atlas: WebGLTexture;
  private readonly rows: number;
  private readonly slots: Slot[];
  private readonly cell = document.createElement("canvas");
  private dirty = false;
  private disposed = false;
  private onLost: () => void = () => {};

  static create(
    canvas: HTMLCanvasElement,
    posters: readonly (string | null)[],
  ): TunnelRenderer | null {
    const gl = canvas.getContext("webgl2", {
      alpha: false,
      antialias: true,
      depth: false,
      powerPreference: "high-performance",
      premultipliedAlpha: true,
      stencil: false,
    });
    if (!gl) return null;
    const wall = createProgram(gl, WALL_FRAGMENT);
    const poster = createProgram(gl, POSTER_FRAGMENT, POSTER_VERTEX);
    if (!wall || !poster) return null;
    return new TunnelRenderer(canvas, gl, wall, poster, posters);
  }

  private constructor(
    private readonly canvas: HTMLCanvasElement,
    gl: WebGL2RenderingContext,
    wall: WebGLProgram,
    poster: WebGLProgram,
    posters: readonly (string | null)[],
  ) {
    this.gl = gl;
    this.wall = wall;
    this.poster = poster;
    this.uw = uniforms(gl, wall, WALL);
    this.up = uniforms(gl, poster, POSTER);

    this.wallVao = this.geometry(wall, "aPosition", [-1, -1, 3, -1, -1, 3]);
    this.quadVao = this.geometry(
      poster,
      "aCorner",
      [-0.5, -0.5, 0.5, -0.5, -0.5, 0.5, 0.5, 0.5],
    );

    this.rows = Math.max(1, Math.ceil(posters.length / COLUMNS));
    this.atlas = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.atlas);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      CELL_W * COLUMNS,
      CELL_H * this.rows,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      null,
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(
      gl.TEXTURE_2D,
      gl.TEXTURE_MIN_FILTER,
      gl.LINEAR_MIPMAP_LINEAR,
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.generateMipmap(gl.TEXTURE_2D);

    this.cell.width = CELL_W;
    this.cell.height = CELL_H;
    this.slots = posters.map(() => ({ arrived: 0, ready: false }));
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

  private geometry(program: WebGLProgram, name: string, data: number[]) {
    const gl = this.gl;
    const array = gl.createVertexArray();
    gl.bindVertexArray(array);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
    const location = gl.getAttribLocation(program, name);
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);
    return array;
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
        const ctx = this.cell.getContext("2d");
        if (!ctx) return;
        // Cover the cell, trimming whatever does not fit 2:3.
        const scale = Math.max(
          CELL_W / image.naturalWidth,
          CELL_H / image.naturalHeight,
        );
        const w = image.naturalWidth * scale;
        const h = image.naturalHeight * scale;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(image, (CELL_W - w) / 2, (CELL_H - h) / 2, w, h);
        const gl = this.gl;
        gl.bindTexture(gl.TEXTURE_2D, this.atlas);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
        gl.texSubImage2D(
          gl.TEXTURE_2D,
          0,
          (index % COLUMNS) * CELL_W,
          Math.floor(index / COLUMNS) * CELL_H,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          this.cell,
        );
        this.dirty = true;
        this.slots[index] = { arrived: performance.now(), ready: true };
      })
      .catch(() => undefined);
  }

  draw(frame: TunnelFrame, posters: readonly Poster[]): void {
    const gl = this.gl;
    if (gl.isContextLost()) return;
    const { height, width } = this.canvas;
    gl.viewport(0, 0, width, height);
    const cam = frame.camera;

    if (this.dirty) {
      gl.bindTexture(gl.TEXTURE_2D, this.atlas);
      gl.generateMipmap(gl.TEXTURE_2D);
      this.dirty = false;
    }

    gl.disable(gl.BLEND);
    gl.useProgram(this.wall);
    gl.bindVertexArray(this.wallVao);
    const w = this.uw;
    gl.uniform2f(w.uRes, width, height);
    gl.uniform3f(w.uCam, ...cam.position);
    gl.uniform3f(w.uRight, ...cam.right);
    gl.uniform3f(w.uUp, ...cam.up);
    gl.uniform3f(w.uBack, ...cam.back);
    gl.uniform1f(w.uTanH, cam.tanHalf);
    gl.uniform1f(w.uAspect, width / height);
    gl.uniform1f(w.uTime, frame.time);
    gl.uniform1f(w.uGate, frame.gate);
    gl.uniform1f(w.uVelocity, frame.velocity);
    gl.uniform1f(w.uExposure, frame.exposure);
    gl.uniform1f(w.uGrain, frame.grain);
    gl.uniform3f(w.uWarm, ...WARM);
    gl.uniform3f(w.uCool, ...COOL);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.useProgram(this.poster);
    gl.bindVertexArray(this.quadVao);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.atlas);
    const p = this.up;
    gl.uniform1i(p.uAtlas, 0);
    gl.uniformMatrix4fv(p.uViewProj, false, cam.viewProj);
    gl.uniform3f(p.uCam, ...cam.position);
    gl.uniform1f(p.uExposure, frame.exposure);

    const camZ = cam.position[2];
    const now = performance.now();
    const order = posters
      .map((poster, index) => ({ index, poster }))
      .filter(({ poster }) => poster.z < camZ + 0.1 && camZ - poster.z < 40)
      .sort((a, b) => a.poster.z - b.poster.z);

    const atlasW = CELL_W * COLUMNS;
    const atlasH = CELL_H * this.rows;
    for (const { index, poster } of order) {
      const slotIndex = index;
      const slot = this.slots[slotIndex];
      const loaded = slot?.ready
        ? Math.min(1, (now - slot.arrived) / FADE_MS)
        : 0;
      const tint = poster.chapter === "theatres" ? WARM : COOL;
      gl.uniform3f(p.uCenter, poster.x, poster.y, poster.z);
      gl.uniform2f(p.uSize, poster.w, poster.h);
      gl.uniform1f(p.uYaw, poster.yaw);
      gl.uniform4f(
        p.uCell,
        ((slotIndex % COLUMNS) * CELL_W) / atlasW,
        (Math.floor(slotIndex / COLUMNS) * CELL_H) / atlasH,
        CELL_W / atlasW,
        CELL_H / atlasH,
      );
      gl.uniform1f(p.uLoaded, loaded);
      gl.uniform1f(p.uHover, frame.hover[index] ?? 0);
      gl.uniform3f(p.uTint, ...tint);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
    gl.bindVertexArray(null);
  }

  dispose(): void {
    this.disposed = true;
    this.canvas.removeEventListener("webglcontextlost", this.handleLost);
    const gl = this.gl;
    if (gl.isContextLost()) return;
    gl.deleteTexture(this.atlas);
    gl.deleteVertexArray(this.wallVao);
    gl.deleteVertexArray(this.quadVao);
    gl.deleteProgram(this.wall);
    gl.deleteProgram(this.poster);
  }
}
