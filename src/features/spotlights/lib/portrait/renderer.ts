import { createProgram, createTexture, fitCanvas, uniforms } from "@/motion/gl";
import { tmdbImageUrl } from "@/infrastructure/tmdb/images";
import { Bloom } from "../bloom";
import { loadBitmap } from "../bitmap";
import { createLoop, type Loop } from "../loop";
import { MAX_FILMS, type Director } from "../types";
import {
  PHOTO_FRAGMENT,
  PHOTO_VERTEX,
  SWARM_FRAGMENT,
  SWARM_VERTEX,
} from "./shader";
import { gatherSwarm, subjectOf, type Swarm, type SwarmSubject } from "./swarm";
import type { SwarmReply, SwarmRequest } from "./swarm.worker";

const NAMES = [
  "uRes",
  "uFace",
  "uPosters",
  "uPhase",
  "uTime",
  "uFaceGrid",
  "uPosterGrid",
  "uScale",
  "uDust",
  "uFade",
] as const;
const PHOTO_NAMES = ["uRes", "uFace", "uPhoto", "uMatte", "uDevelop"] as const;

const GATHER_S = 4.6;
const SCATTER_S = 2.1;
// Between directors the swarm goes to dust instead, quicker both ways.
const CRUMBLE_S = 1.1;
const CONDENSE_S = 2.6;
// How far the swarm has flown when the face reads as a face.
const FORMED = 0.62;
// Once it has landed the photograph develops over it; before a change it
// fades back to the dots, which then go.
const DEVELOP_S = 2.4;
const UNDEVELOP_S = 0.7;
const PHOTO = { height: 1350, width: 900 };
const LOOK = { amount: 0.12, grain: 0.03, threshold: 1, vignette: 0.5 };

function spawnGatherer(): Worker | null {
  if (typeof Worker !== "function" || typeof OffscreenCanvas !== "function") {
    return null;
  }
  try {
    return new Worker(new URL("./swarm.worker.ts", import.meta.url), {
      type: "module",
    });
  } catch {
    return null;
  }
}

interface Job {
  done(swarm: Swarm | null): void;
  subject: SwarmSubject;
}

export interface Box {
  height: number;
  width: number;
  x: number;
  y: number;
}

export interface PortraitEvents {
  /** The face has risen far enough to read. */
  formed(index: number): void;
  /** The swarm now belongs to this director (its posters should show). */
  swapped(index: number): void;
}

// Runs the swarm. The first face rises out of its posters; every later
// change fades the photograph back to dots, crumbles them to dust and
// condenses the next face out of it. A face that has landed develops into
// its photograph.
// Each new swarm waits until the page pours it. The page keeps the DOM
// posters in place and tells this class where they are.
export class Portrait {
  private readonly loop: Loop;
  private readonly bloom: Bloom;
  private readonly u;
  private readonly up;
  private readonly photo: WebGLTexture;
  private readonly matte: WebGLTexture;
  private readonly photos = new Map<number, Promise<ImageBitmap | null>>();
  private developed: number | null = null;
  private develop = 0;
  private readonly vao: WebGLVertexArrayObject;
  private readonly buffers: WebGLBuffer[];
  private readonly swarms = new Map<number, Promise<Swarm | null>>();
  private swarm: Swarm | null = null;
  private shown: number | null = null;
  private wanted: number | null = null;
  private ready: { photo: ImageBitmap | null; swarm: Swarm | null } | null =
    null;
  private poured: number | null = null;
  private dust = false;
  private phase = 0;
  private readonly boxes = new Float32Array(MAX_FILMS * 4);
  private gatherer = spawnGatherer();
  private readonly jobs = new Map<number, Job>();
  private job = 0;
  private face: Box | null = null;
  private posters: Box[] = [];
  private reduced = false;
  private disposed = false;
  private readonly started = performance.now() / 1000;

  static create(
    canvas: HTMLCanvasElement,
    directors: readonly Director[],
    columns: number,
    events: PortraitEvents,
  ): Portrait | null {
    const gl = canvas.getContext("webgl2", {
      alpha: false,
      antialias: false,
      powerPreference: "high-performance",
    });
    if (!gl) return null;
    const program = createProgram(gl, SWARM_FRAGMENT, SWARM_VERTEX);
    const photo = createProgram(gl, PHOTO_FRAGMENT, PHOTO_VERTEX);
    const bloom = Bloom.create(gl);
    if (!program || !photo || !bloom) return null;
    return new Portrait(
      canvas,
      gl,
      [program, photo],
      bloom,
      directors,
      columns,
      events,
    );
  }

  private constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly gl: WebGL2RenderingContext,
    private readonly programs: readonly [WebGLProgram, WebGLProgram],
    bloom: Bloom,
    private readonly directors: readonly Director[],
    private readonly columns: number,
    private readonly events: PortraitEvents,
  ) {
    this.bloom = bloom;
    this.u = uniforms(gl, programs[0], NAMES);
    this.up = uniforms(gl, programs[1], PHOTO_NAMES);
    this.photo = createTexture(gl, gl.LINEAR_MIPMAP_LINEAR);
    this.matte = createTexture(gl);
    // The bloom passes draw one triangle from attribute 0 of the default
    // array; the swarm keeps its own vertex array.
    const post = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, post);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW,
    );
    for (const pass of bloom.programs) {
      const location = gl.getAttribLocation(pass, "aPosition");
      if (location < 0) continue;
      gl.enableVertexAttribArray(location);
      gl.vertexAttribPointer(location, 2, gl.FLOAT, false, 0, 0);
    }
    this.vao = gl.createVertexArray()!;
    gl.bindVertexArray(this.vao);
    this.buffers = [2, 2, 3, 3, 3].map((size, location) => {
      const buffer = gl.createBuffer()!;
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.enableVertexAttribArray(location);
      gl.vertexAttribPointer(location, size, gl.FLOAT, false, 0, 0);
      return buffer;
    });
    gl.bindVertexArray(null);
    if (this.gatherer) {
      this.gatherer.onmessage = ({ data }: MessageEvent<SwarmReply>) => {
        this.jobs.get(data.job)?.done(data.swarm);
        this.jobs.delete(data.job);
      };
      // A worker that will not load leaves the work to this thread.
      this.gatherer.onerror = () => {
        this.gatherer?.terminate();
        this.gatherer = null;
        for (const { done, subject } of this.jobs.values()) {
          void gatherSwarm(subject, this.columns).then(done);
        }
        this.jobs.clear();
      };
    }
    this.loop = createLoop((now, dt) => this.frame(now, dt));
  }

  setReduced(reduced: boolean): void {
    this.reduced = reduced;
    this.loop.wake();
  }

  /** CSS-pixel boxes of the portrait and of every poster, in film order. */
  place(face: Box, posters: Box[]): void {
    this.face = face;
    this.posters = posters;
    fitCanvas(this.canvas, 1.75);
    this.loop.wake();
  }

  show(index: number): void {
    // Only a swarm at rest can change where its particles call home.
    if (index !== this.shown && this.shown !== null) {
      if (this.phase === 0 || this.phase === 1) this.dust = true;
    }
    this.wanted = index;
    // A swarm is a few megabytes: keep only this director and its neighbours.
    const count = this.directors.length;
    const far = (kept: number) => {
      const apart = Math.abs(kept - index);
      return Math.min(apart, count - apart) > 1 && kept !== this.shown;
    };
    for (const kept of this.swarms.keys()) {
      if (far(kept)) this.swarms.delete(kept);
    }
    for (const [kept, photo] of this.photos) {
      if (!far(kept)) continue;
      void photo.then((bitmap) => bitmap?.close());
      this.photos.delete(kept);
    }
    this.ready = null;
    // Nothing shows until the face and its photograph are both in hand.
    void Promise.all([this.gather(index), this.picture(index)]).then(
      ([swarm, photo]) => {
        if (this.wanted !== index || this.disposed) return;
        this.ready = { photo, swarm };
        this.loop.wake();
        // Warm the next director while this one settles.
        const next = (index + 1) % this.directors.length;
        void this.gather(next);
        void this.picture(next);
      },
    );
    this.loop.wake();
  }

  /** Lets this director's swarm leave its posters for the face. */
  pour(index: number): void {
    this.poured = index;
    this.loop.wake();
  }

  dispose(): void {
    this.disposed = true;
    this.gatherer?.terminate();
    for (const { done } of this.jobs.values()) done(null);
    this.jobs.clear();
    this.loop.dispose();
    this.bloom.dispose();
    for (const buffer of this.buffers) this.gl.deleteBuffer(buffer);
    this.gl.deleteVertexArray(this.vao);
    for (const program of this.programs) this.gl.deleteProgram(program);
    this.gl.deleteTexture(this.photo);
    this.gl.deleteTexture(this.matte);
    for (const bitmap of this.photos.values()) {
      void bitmap.then((image) => image?.close());
    }
    this.photos.clear();
  }

  private gather(index: number): Promise<Swarm | null> {
    let swarm = this.swarms.get(index);
    if (!swarm) {
      const subject = subjectOf(this.directors[index]!);
      const gatherer = this.gatherer;
      swarm = gatherer
        ? new Promise<Swarm | null>((done) => {
            const job = (this.job += 1);
            this.jobs.set(job, { done, subject });
            const request: SwarmRequest = {
              columns: this.columns,
              job,
              subject,
            };
            gatherer.postMessage(request);
          })
        : gatherSwarm(subject, this.columns);
      this.swarms.set(index, swarm);
    }
    return swarm;
  }

  private picture(index: number): Promise<ImageBitmap | null> {
    let photo = this.photos.get(index);
    if (!photo) {
      const src = tmdbImageUrl(
        "profile",
        this.directors[index]!.profilePath,
        "original",
      );
      photo = src ? loadBitmap(src, PHOTO) : Promise.resolve(null);
      this.photos.set(index, photo);
    }
    return photo;
  }

  private upload(swarm: Swarm, photo: ImageBitmap | null): void {
    const gl = this.gl;
    [swarm.home, swarm.face, swarm.color, swarm.meta, swarm.source].forEach(
      (data, i) => {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers[i]!);
        gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
      },
    );
    this.swarm = swarm;
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.bindTexture(gl.TEXTURE_2D, this.matte);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA8,
      swarm.faceGrid[0],
      swarm.faceGrid[1],
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      swarm.matte,
    );
    if (photo) {
      gl.bindTexture(gl.TEXTURE_2D, this.photo);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        photo,
      );
      gl.generateMipmap(gl.TEXTURE_2D);
    }
    this.developed = photo ? this.wanted : null;
    this.develop = 0;
  }

  private frame(now: number, dt: number): boolean {
    const gl = this.gl;
    const face = this.face;
    if (!face) return false;
    fitCanvas(this.canvas, 1.75);

    // A change first takes the photograph back to dots, then moves them.
    const changing = this.wanted !== null && this.wanted !== this.shown;
    if (changing && this.develop > 0) {
      this.develop = this.reduced
        ? 0
        : Math.max(0, this.develop - dt / UNDEVELOP_S);
    } else if (changing) {
      const leave = this.dust ? CRUMBLE_S : SCATTER_S;
      this.phase = this.reduced ? 0 : Math.max(0, this.phase - dt / leave);
      if (this.phase === 0 && this.ready?.swarm) {
        if (this.shown !== null) this.dust = true;
        this.upload(this.ready.swarm, this.ready.photo);
        this.shown = this.wanted;
        this.events.swapped(this.shown!);
      }
    } else if (this.swarm && this.poured === this.shown) {
      const was = this.phase;
      const gather = this.dust ? CONDENSE_S : GATHER_S;
      this.phase = this.reduced ? 1 : Math.min(1, this.phase + dt / gather);
      if (was < FORMED && this.phase >= FORMED) this.events.formed(this.shown!);
      if (this.phase === 1 && this.developed === this.shown) {
        this.develop = this.reduced
          ? 1
          : Math.min(1, this.develop + dt / DEVELOP_S);
      }
    }

    const width = this.canvas.width;
    const height = this.canvas.height;
    const ratio = width / Math.max(1, this.canvas.clientWidth);
    this.bloom.begin(width, height);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    const time = now - this.started;
    const swarm = this.swarm;
    const box = [
      face.x * ratio,
      face.y * ratio,
      face.width * ratio,
      face.height * ratio,
    ] as const;
    const develop = this.develop * this.develop * (3 - 2 * this.develop);
    if (swarm && this.posters.length > 0 && develop < 1) {
      gl.useProgram(this.programs[0]);
      const u = this.u;
      gl.uniform2f(u.uRes, width, height);
      gl.uniform4f(u.uFace, ...box);
      const films = Math.min(MAX_FILMS, this.posters.length);
      for (let f = 0; f < films; f += 1) {
        const poster = this.posters[f]!;
        this.boxes[f * 4] = poster.x * ratio;
        this.boxes[f * 4 + 1] = poster.y * ratio;
        this.boxes[f * 4 + 2] = poster.width * ratio;
        this.boxes[f * 4 + 3] = poster.height * ratio;
      }
      gl.uniform4fv(u.uPosters, this.boxes, 0, films * 4);
      gl.uniform1f(u.uPhase, this.phase);
      gl.uniform1f(u.uTime, time);
      gl.uniform2f(u.uFaceGrid, ...swarm.faceGrid);
      gl.uniform2f(u.uPosterGrid, ...swarm.posterGrid);
      gl.uniform1f(u.uScale, ratio);
      gl.uniform1f(u.uDust, this.dust ? 1 : 0);
      gl.uniform1f(u.uFade, develop);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.bindVertexArray(this.vao);
      gl.drawArrays(gl.POINTS, 0, swarm.count);
      gl.bindVertexArray(null);
      gl.disable(gl.BLEND);
    }
    if (swarm && develop > 0) {
      gl.useProgram(this.programs[1]);
      const u = this.up;
      gl.uniform2f(u.uRes, width, height);
      gl.uniform4f(u.uFace, ...box);
      gl.uniform1f(u.uDevelop, develop);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.photo);
      gl.uniform1i(u.uPhoto, 0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, this.matte);
      gl.uniform1i(u.uMatte, 1);
      gl.activeTexture(gl.TEXTURE0);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      gl.disable(gl.BLEND);
    }
    this.bloom.present(LOOK, time);

    const developing =
      this.developed === this.shown && this.phase === 1 && this.develop < 1;
    return (
      changing ||
      developing ||
      (this.swarm !== null && this.poured === this.shown && this.phase < 1)
    );
  }
}
