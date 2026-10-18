import {
  bindFullscreen,
  createProgram,
  readable,
  uniforms,
} from "@/motion/film/gl";
import { CANON_FILMS, CANON_FRAGMENT } from "./canon-shader";
import type { Vec2 } from "./canon-wall";
import { decodeOriginal, sizeOf } from "./frames";

const NAMES = [
  "uRes",
  "uPitch",
  "uPan",
  "uFocus",
  "uLens",
  "uRadius",
  "uBulge",
  "uLamp",
  "uPrints",
  "uState",
  "uCount",
  "uMarks",
  "uSelected",
  "uExposure",
  "uTime",
  "uGrain",
  "uMirror",
  "uMirrorOn",
  "uLoupe",
  "uLoupeIndex",
  "uLoupeMix",
  "uLoupeCrop",
] as const;

const FADE_MS = 700;
// Prints are fetched in chart order, a few at a time, so the top of the
// chart is on the wall first.
const IN_FLIGHT = 6;
// New prints are gathered up and the mip chain rebuilt at most this often.
const MIP_EVERY_MS = 300;
// The print under the loupe is magnified past what the wall's own prints
// hold, so it is fetched again, larger, once the pointer has rested on it
// this long, and drawn from that.
const LOUPE_WAIT_MS = 110;
const LOUPE_LONGEST = 1100;
const LOUPE_FADE_MS = 260;
const UNIT = { loupe: 2, prints: 0 } as const;

export interface CanonFilmState {
  listed: boolean;
  lift: number;
  match: number;
  seen: number;
}

export interface CanonFrame {
  bulge: number;
  exposure: number;
  focus: Vec2;
  grain: number;
  lamp: Vec2;
  lens: number;
  marks: boolean;
  // The doorway at the end of the tunnel, in CSS pixels, while the wall is
  // seen through it: left, top, right, bottom.
  mirror?: readonly [number, number, number, number] | null;
  pan: Vec2;
  pitch: number;
  radius: number;
  selected: number;
  time: number;
}

export class CanonRenderer {
  readonly lost: Promise<void>;
  private readonly gl: WebGL2RenderingContext;
  private readonly u: Record<
    (typeof NAMES)[number],
    WebGLUniformLocation | null
  >;
  private readonly prints: WebGLTexture;
  private readonly cell = document.createElement("canvas");
  private readonly arrived: number[];
  private readonly state = new Float32Array(CANON_FILMS * 4);
  private readonly count: number;
  private dirtySince = 0;
  private disposed = false;
  private readonly queue: { index: number; src: string }[] = [];
  private flying = 0;
  private started = false;
  // Where the small copy for the tunnel is drawn and read back.
  private copy: {
    fbo: WebGLFramebuffer;
    height: number;
    texture: WebGLTexture;
    width: number;
  } | null = null;
  private rows = new Uint8Array(0);
  // The larger print under the loupe: the one asked for, and the one held.
  private readonly loupe: {
    abort: AbortController | null;
    at: number;
    crop: [number, number];
    index: number;
    texture: WebGLTexture;
    want: { at: number; index: number; src: string | null };
  };
  private onLost: () => void = () => {};

  static create(
    canvas: HTMLCanvasElement,
    posters: readonly (string | null)[],
    small: boolean,
  ): CanonRenderer | null {
    const gl = canvas.getContext("webgl2", {
      alpha: false,
      antialias: false,
      depth: false,
      powerPreference: "high-performance",
      premultipliedAlpha: false,
      stencil: false,
    });
    if (!gl) return null;
    const program = createProgram(gl, CANON_FRAGMENT);
    if (!program) return null;
    return new CanonRenderer(canvas, gl, program, posters, small);
  }

  private constructor(
    private readonly canvas: HTMLCanvasElement,
    gl: WebGL2RenderingContext,
    program: WebGLProgram,
    posters: readonly (string | null)[],
    small: boolean,
  ) {
    this.gl = gl;
    this.count = Math.min(CANON_FILMS, posters.length);
    gl.useProgram(program);
    bindFullscreen(gl, program);
    this.u = uniforms(gl, program, NAMES);
    gl.uniform1i(this.u.uPrints, UNIT.prints);
    gl.uniform1i(this.u.uLoupe, UNIT.loupe);

    // One layer per film, so no print ever bleeds into its neighbour.
    this.cell.width = small ? 200 : 280;
    this.cell.height = small ? 300 : 420;
    const levels =
      Math.floor(Math.log2(Math.max(this.cell.width, this.cell.height))) + 1;
    this.prints = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, this.prints);
    gl.texStorage3D(
      gl.TEXTURE_2D_ARRAY,
      levels,
      gl.RGBA8,
      this.cell.width,
      this.cell.height,
      Math.max(1, this.count),
    );
    gl.texParameteri(
      gl.TEXTURE_2D_ARRAY,
      gl.TEXTURE_MIN_FILTER,
      gl.LINEAR_MIPMAP_LINEAR,
    );
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    const loupe = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + UNIT.loupe);
    gl.bindTexture(gl.TEXTURE_2D, loupe);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
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
    gl.activeTexture(gl.TEXTURE0);
    this.loupe = {
      abort: null,
      at: 0,
      crop: [1, 1],
      index: -1,
      texture: loupe,
      want: { at: 0, index: -1, src: null },
    };

    this.arrived = posters.map(() => Number.NaN);
    posters.slice(0, this.count).forEach((src, index) => {
      if (src) this.queue.push({ index, src });
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

  // Starts fetching the prints; until then the wall holds blank glass.
  start(): void {
    if (this.started) return;
    this.started = true;
    this.pump();
  }

  private pump(): void {
    while (this.flying < IN_FLIGHT && this.queue.length > 0 && !this.disposed) {
      const next = this.queue.shift()!;
      this.flying += 1;
      void this.load(next.src, next.index).finally(() => {
        this.flying -= 1;
        this.pump();
      });
    }
  }

  private load(src: string, index: number): Promise<void> {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.decoding = "async";
    image.src = readable(src);
    return image
      .decode()
      .then(() => {
        if (this.disposed || this.gl.isContextLost()) return;
        const ctx = this.cell.getContext("2d");
        if (!ctx) return;
        const { height, width } = this.cell;
        const scale = Math.max(
          width / image.naturalWidth,
          height / image.naturalHeight,
        );
        const w = image.naturalWidth * scale;
        const h = image.naturalHeight * scale;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(image, (width - w) / 2, (height - h) / 2, w, h);
        const gl = this.gl;
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D_ARRAY, this.prints);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
        gl.texSubImage3D(
          gl.TEXTURE_2D_ARRAY,
          0,
          0,
          0,
          index,
          width,
          height,
          1,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          this.cell,
        );
        this.dirtySince ||= performance.now();
        this.arrived[index] = Number.POSITIVE_INFINITY;
      })
      .catch(() => undefined);
  }

  // The film under the loupe, or -1, and its larger print.
  focus(index: number, src: string | null): void {
    const want = this.loupe.want;
    if (want.index === index && want.src === src) return;
    this.loupe.want = { at: performance.now(), index, src };
  }

  private fetchLoupe(now: number): void {
    const loupe = this.loupe;
    const { index, src } = loupe.want;
    if (index === loupe.index || !src || index < 0) return;
    if (now - loupe.want.at < LOUPE_WAIT_MS || loupe.abort) return;
    const abort = new AbortController();
    loupe.abort = abort;
    void decodeOriginal(src, LOUPE_LONGEST, abort.signal).then((picture) => {
      if (loupe.abort === abort) loupe.abort = null;
      if (!picture || this.disposed || this.gl.isContextLost()) {
        if (picture instanceof ImageBitmap) picture.close();
        return;
      }
      // Still the film asked for: anything else waits for the next fetch.
      if (loupe.want.index === index) {
        const gl = this.gl;
        gl.activeTexture(gl.TEXTURE0 + UNIT.loupe);
        gl.bindTexture(gl.TEXTURE_2D, loupe.texture);
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
        gl.activeTexture(gl.TEXTURE0);
        // Cropped as the wall's cell crops it: to cover, from the middle.
        const { height, width } = sizeOf(picture);
        const cell = this.cell.width / this.cell.height;
        const image = width / Math.max(1, height);
        loupe.crop = image > cell ? [cell / image, 1] : [1, image / cell];
        loupe.index = index;
        loupe.at = performance.now();
      }
      if (picture instanceof ImageBitmap) picture.close();
    });
  }

  get maxTexture(): number {
    return this.gl.getParameter(this.gl.MAX_TEXTURE_SIZE) as number;
  }

  draw(frame: CanonFrame, films: readonly CanonFilmState[]): void {
    const gl = this.gl;
    if (gl.isContextLost()) return;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    this.render(frame, films, this.canvas.width, this.canvas.height);
  }

  // Draws the wall small, off screen, and reads it back: the copy the tunnel
  // paints into its doorway. Top row first.
  capture(
    frame: CanonFrame,
    films: readonly CanonFilmState[],
    width: number,
    height: number,
    into: Uint8Array,
  ): boolean {
    const gl = this.gl;
    if (gl.isContextLost() || width < 1 || height < 1) return false;
    const copy = this.copyTarget(width, height);
    gl.bindFramebuffer(gl.FRAMEBUFFER, copy.fbo);
    this.render(
      {
        ...frame,
        grain: 0,
        mirror: null,
        pitch: (frame.pitch * height) / this.canvas.height,
      },
      films,
      width,
      height,
    );
    const rows =
      this.rows.length >= width * height * 4
        ? this.rows
        : (this.rows = new Uint8Array(width * height * 4));
    gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, rows);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    const stride = width * 4;
    for (let y = 0; y < height; y += 1) {
      into.set(
        rows.subarray((height - 1 - y) * stride, (height - y) * stride),
        y * stride,
      );
    }
    return true;
  }

  private copyTarget(width: number, height: number) {
    const gl = this.gl;
    if (this.copy?.width === width && this.copy.height === height) {
      return this.copy;
    }
    if (this.copy) {
      gl.deleteFramebuffer(this.copy.fbo);
      gl.deleteTexture(this.copy.texture);
    }
    const texture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA8, width, height);
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
    gl.activeTexture(gl.TEXTURE0);
    this.copy = { fbo, height, texture, width };
    return this.copy;
  }

  private render(
    frame: CanonFrame,
    films: readonly CanonFilmState[],
    width: number,
    height: number,
  ): void {
    const gl = this.gl;
    const now = performance.now();

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, this.prints);
    if (this.dirtySince && now - this.dirtySince > MIP_EVERY_MS) {
      gl.generateMipmap(gl.TEXTURE_2D_ARRAY);
      this.dirtySince = 0;
      // Prints fade in from the moment their full chain is ready.
      this.arrived.forEach((at, index) => {
        if (at === Number.POSITIVE_INFINITY) this.arrived[index] = now;
      });
    }

    for (let index = 0; index < this.count; index += 1) {
      const film = films[index];
      const at = this.arrived[index]!;
      const loaded = Number.isFinite(at)
        ? Math.min(1, (now - at) / FADE_MS)
        : 0;
      this.state[index * 4] = loaded + (film?.listed ? 2 : 0);
      this.state[index * 4 + 1] = film?.seen ?? 0;
      this.state[index * 4 + 2] = film?.lift ?? 0;
      this.state[index * 4 + 3] = film?.match ?? 1;
    }

    gl.viewport(0, 0, width, height);
    const u = this.u;
    gl.uniform2f(u.uRes, width, height);
    gl.uniform1f(u.uPitch, frame.pitch);
    gl.uniform2f(u.uPan, frame.pan[0], frame.pan[1]);
    gl.uniform2f(u.uFocus, frame.focus[0], frame.focus[1]);
    gl.uniform1f(u.uLens, frame.lens);
    gl.uniform1f(u.uRadius, frame.radius);
    gl.uniform1f(u.uBulge, frame.bulge);
    gl.uniform2f(u.uLamp, frame.lamp[0], frame.lamp[1]);
    gl.uniform4fv(u.uState, this.state);
    gl.uniform1f(u.uCount, this.count);
    gl.uniform1f(u.uMarks, frame.marks ? 1 : 0);
    gl.uniform1f(u.uSelected, frame.selected);
    gl.uniform1f(u.uExposure, frame.exposure);
    this.fetchLoupe(now);
    const loupe = this.loupe;
    const held = loupe.index >= 0 && loupe.index === loupe.want.index;
    gl.uniform1f(u.uLoupeIndex, held ? loupe.index : -1);
    gl.uniform1f(
      u.uLoupeMix,
      held ? Math.min(1, (now - loupe.at) / LOUPE_FADE_MS) : 0,
    );
    gl.uniform2f(u.uLoupeCrop, loupe.crop[0], loupe.crop[1]);
    gl.activeTexture(gl.TEXTURE0 + UNIT.loupe);
    gl.bindTexture(gl.TEXTURE_2D, loupe.texture);
    gl.activeTexture(gl.TEXTURE0);
    gl.uniform1f(u.uTime, frame.time);
    gl.uniform1f(u.uGrain, frame.grain);
    const scale = height / Math.max(1, this.canvas.clientHeight);
    const mirror = frame.mirror;
    gl.uniform1f(u.uMirrorOn, mirror ? 1 : 0);
    gl.uniform4f(
      u.uMirror,
      (mirror?.[0] ?? 0) * scale,
      (mirror?.[1] ?? 0) * scale,
      (mirror?.[2] ?? 0) * scale,
      (mirror?.[3] ?? 0) * scale,
    );
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  dispose(): void {
    this.disposed = true;
    this.canvas.removeEventListener("webglcontextlost", this.handleLost);
    const gl = this.gl;
    if (gl.isContextLost()) return;
    this.loupe.abort?.abort();
    gl.deleteTexture(this.prints);
    gl.deleteTexture(this.loupe.texture);
    if (this.copy) {
      gl.deleteFramebuffer(this.copy.fbo);
      gl.deleteTexture(this.copy.texture);
    }
  }
}
