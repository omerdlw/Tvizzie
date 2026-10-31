import {
  bindFullscreen,
  createProgram,
  createTexture,
  fitCanvas,
  sampleClamped,
  uniforms,
} from "@/motion/gl";
import { tmdbImageUrl } from "@/infrastructure/tmdb/images";
import { loadBitmap } from "../bitmap";
import { approach, createLoop, type Loop } from "../loop";
import type { CanonFilm } from "../types";
import {
  filmAt,
  nearestCopy,
  pitches,
  wallAt,
  type Vec2,
  type View,
} from "./geometry";
import { MAX_PRINTS, WALL_FRAGMENT } from "./shader";

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
  "uRank",
  "uCount",
  "uMarks",
  "uSelected",
  "uOpen",
  "uNumbers",
  "uTime",
  "uLoupe",
  "uLoupeIndex",
  "uLoupeMix",
  "uDigits",
] as const;

const UNIT = { digits: 2, loupe: 1, prints: 0 } as const;
const IN_FLIGHT = 6;
const MIP_EVERY_MS = 300;
const ARRIVE_S = 0.6;
const LOUPE_WAIT_MS = 110;
const LOUPE_FADE_S = 0.26;
const LOUPE = { height: 1050, width: 700 };

// The opening, beat by beat: it holds in the dark until enough prints are
// in hand (or waiting would show), the lamp comes on in the middle, the
// wave develops the wall out from it, then the numerals come up.
const OPEN_READY = 40;
const OPEN_PATIENCE_MS = 3500;
const LAMP_S = 1.1;
const WAVE_AT = 0.55;
const WAVE_S = 2.8;
const NUMBERS_S = 1.2;

const BULGE = 0.16;
const LENS = { near: 0.42, rest: 0.26 };
const RADIUS = 0.3;
const INERTIA = 3.2;
const GLIDE_S = 0.9;
const WHEEL_S = 0.12;
const CLICK_SLOP = 6;

export interface FilmMarks {
  listed: boolean;
  /** Whether it passes the viewer's filter. */
  match: boolean;
  seen: boolean;
}

export interface WallEvents {
  /** The film under the hand changed (-1: none). */
  hovered(index: number): void;
  /** The opening has run: the wall is up and numbered. */
  opened(): void;
}

interface Look {
  lift: number;
  match: number;
  seen: number;
}

// Runs the canon wall: the prints' textures, the hand's lens and lamp, the
// pan (dragged, wheeled or glided to a film) and the opening. The page
// keeps the DOM around it and hears which film is under the hand.
export class Wall {
  private readonly loop: Loop;
  private readonly u;
  private readonly prints: WebGLTexture;
  private readonly loupe: WebGLTexture;
  private readonly digits: WebGLTexture;
  private readonly state = new Float32Array(MAX_PRINTS * 4);
  private readonly rank = new Float32Array(MAX_PRINTS);
  private readonly count: number;
  private readonly cell: { height: number; width: number };
  private readonly arrived: number[];
  private readonly looks: Look[];
  private readonly queue: number[];
  private flying = 0;
  private loaded = 0;
  private dirtySince = 0;
  private marks: FilmMarks[] | null = null;
  private loupeAt = -1;
  private loupeWant = { at: 0, index: -1 };
  private loupeMix = 0;
  private loupeAbort: AbortController | null = null;

  private width = 1;
  private height = 1;
  private pitch = 1;
  private offset: Vec2 = [0, 0];
  private velocity: Vec2 = [0, 0];
  private pending: Vec2 = [0, 0];
  private glide: Vec2 | null = null;
  private hand: { at: number; x: number; y: number } | null = null;
  private held: { at: number; moved: number; x: number; y: number } | null =
    null;
  private focus: Vec2 = [0, 0];
  private lampAt: Vec2 = [0, 0];
  private lens = LENS.rest;
  private hover = -1;
  private selected = 0;

  private readonly born = performance.now();
  private lamp = 0;
  private open = 0;
  private numbers = 0;
  private started = false;
  private opened = false;
  private reduced = false;
  private disposed = false;

  static create(
    canvas: HTMLCanvasElement,
    films: readonly CanonFilm[],
    events: WallEvents,
  ): Wall | null {
    const gl = canvas.getContext("webgl2", {
      alpha: false,
      antialias: false,
      depth: false,
      powerPreference: "high-performance",
      stencil: false,
    });
    if (!gl) return null;
    const program = createProgram(gl, WALL_FRAGMENT);
    if (!program) return null;
    return new Wall(canvas, gl, program, films, events);
  }

  private constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly gl: WebGL2RenderingContext,
    private readonly program: WebGLProgram,
    private readonly films: readonly CanonFilm[],
    private readonly events: WallEvents,
  ) {
    this.count = Math.min(MAX_PRINTS, films.length);
    gl.useProgram(program);
    bindFullscreen(gl, program);
    this.u = uniforms(gl, program, NAMES);
    gl.uniform1i(this.u.uPrints, UNIT.prints);
    gl.uniform1i(this.u.uLoupe, UNIT.loupe);
    gl.uniform1i(this.u.uDigits, UNIT.digits);
    films.slice(0, this.count).forEach((film, i) => {
      this.rank[i] = film.rank;
    });

    const small = Math.max(window.innerWidth, window.innerHeight) < 900;
    this.cell = small
      ? { height: 300, width: 200 }
      : { height: 420, width: 280 };
    const levels =
      Math.floor(Math.log2(Math.max(this.cell.width, this.cell.height))) + 1;
    gl.activeTexture(gl.TEXTURE0 + UNIT.prints);
    this.prints = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, this.prints);
    gl.texStorage3D(
      gl.TEXTURE_2D_ARRAY,
      levels,
      gl.RGBA8,
      this.cell.width,
      this.cell.height,
      Math.max(1, this.count),
    );
    sampleClamped(gl, gl.LINEAR_MIPMAP_LINEAR, gl.TEXTURE_2D_ARRAY);

    gl.activeTexture(gl.TEXTURE0 + UNIT.loupe);
    this.loupe = createTexture(gl, gl.LINEAR_MIPMAP_LINEAR);
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
    gl.activeTexture(gl.TEXTURE0 + UNIT.digits);
    this.digits = createTexture(gl, gl.LINEAR_MIPMAP_LINEAR);
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
    void this.cutDigits();

    this.arrived = films.map(() => Number.NaN);
    this.looks = films.map(() => ({ lift: 0, match: 1, seen: 0 }));
    this.queue = Array.from({ length: this.count }, (_, i) => i);
    this.pump();
    this.loop = createLoop((now, dt) => this.frame(now, dt));
  }

  setReduced(reduced: boolean): void {
    this.reduced = reduced;
    this.loop.wake();
  }

  /** The viewer's library against the canon, or null when signed out. */
  setMarks(marks: FilmMarks[] | null): void {
    this.marks = marks;
    this.loop.wake();
  }

  /** Picks a film and, unless told not to, glides the wall to it. */
  select(index: number, glide = true): void {
    this.selected = index;
    if (glide) {
      const at = this.view().pan;
      const to = nearestCopy(index, at, this.count);
      const goal: Vec2 = [
        this.offset[0] + to[0] - at[0],
        this.offset[1] + to[1] - at[1],
      ];
      this.velocity = [0, 0];
      this.pending = [0, 0];
      if (this.reduced) this.offset = goal;
      else this.glide = goal;
    }
    this.loop.wake();
  }

  /** The hand, in CSS pixels; null when it leaves. */
  point(x: number | null, y: number | null): void {
    this.hand =
      x === null || y === null ? null : { at: performance.now(), x, y };
    this.loop.wake();
  }

  grab(x: number, y: number): void {
    this.held = { at: performance.now(), moved: 0, x, y };
    this.glide = null;
    this.velocity = [0, 0];
    this.pending = [0, 0];
    this.loop.wake();
  }

  drag(x: number, y: number): void {
    const held = this.held;
    if (!held) return;
    const now = performance.now();
    const dt = (now - held.at) / 1000;
    const view = this.view();
    const from = wallAt(view, held.x, held.y);
    const to = wallAt(view, x, y);
    const dx = to[0] - from[0];
    const dy = to[1] - from[1];
    this.offset[0] -= dx;
    this.offset[1] -= dy;
    const step = Math.max(dt, 1 / 240);
    this.velocity = [
      approach(this.velocity[0], -dx / step, 0.08, step),
      approach(this.velocity[1], -dy / step, 0.08, step),
    ];
    held.moved += Math.hypot(x - held.x, y - held.y);
    held.at = now;
    held.x = x;
    held.y = y;
    this.loop.wake();
  }

  /** Lets go; true when the hand barely moved, so it was a click. */
  drop(): boolean {
    const held = this.held;
    this.held = null;
    if (!held) return false;
    const click = held.moved < CLICK_SLOP;
    // A hand that stopped before letting go throws nothing.
    const still = performance.now() - held.at > 90;
    if (click || still || this.reduced) this.velocity = [0, 0];
    this.loop.wake();
    return click;
  }

  /** A wheel or trackpad turn, in CSS pixels. */
  scroll(dx: number, dy: number): void {
    const [px, py] = pitches(this.pitch);
    this.glide = null;
    this.velocity = [0, 0];
    this.pending[0] += dx / px;
    this.pending[1] += dy / py;
    if (this.reduced) {
      this.offset[0] += this.pending[0];
      this.offset[1] += this.pending[1];
      this.pending = [0, 0];
    }
    this.loop.wake();
  }

  filmAt(x: number, y: number): number {
    return filmAt(wallAt(this.view(), x, y), this.count);
  }

  dispose(): void {
    this.disposed = true;
    this.loop.dispose();
    this.loupeAbort?.abort();
    const gl = this.gl;
    gl.deleteTexture(this.prints);
    gl.deleteTexture(this.loupe);
    gl.deleteTexture(this.digits);
    gl.deleteProgram(this.program);
  }

  private view(): View {
    return {
      bulge: BULGE,
      focus: this.focus,
      height: this.height,
      lens: this.lens,
      pan: [0.5 + this.offset[0], 0.5 + this.offset[1]],
      pitch: this.pitch,
      radius: RADIUS,
      width: this.width,
    };
  }

  private pump(): void {
    while (this.flying < IN_FLIGHT && this.queue.length > 0) {
      const index = this.queue.shift()!;
      this.flying += 1;
      void this.load(index).finally(() => {
        this.flying -= 1;
        if (!this.disposed) this.pump();
      });
    }
  }

  private async load(index: number): Promise<void> {
    const src = tmdbImageUrl("poster", this.films[index]!.posterPath, "w342");
    const bitmap = src ? await loadBitmap(src, this.cell) : null;
    if (!bitmap || this.disposed || this.gl.isContextLost()) {
      bitmap?.close();
      return;
    }
    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE0 + UNIT.prints);
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, this.prints);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texSubImage3D(
      gl.TEXTURE_2D_ARRAY,
      0,
      0,
      0,
      index,
      this.cell.width,
      this.cell.height,
      1,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      bitmap,
    );
    bitmap.close();
    this.dirtySince ||= performance.now();
    this.arrived[index] = Number.POSITIVE_INFINITY;
    this.loaded += 1;
    this.loop.wake();
  }

  // The numerals as a strip of ten glyphs in the page's own face.
  private async cutDigits(): Promise<void> {
    const family = getComputedStyle(document.body).fontFamily;
    const face = `600 76px ${family}`;
    await document.fonts.load(face, "0123456789").catch(() => undefined);
    if (this.disposed) return;
    const cell = { height: 96, width: 58 };
    const canvas = new OffscreenCanvas(cell.width * 10, cell.height);
    const context = canvas.getContext("2d");
    if (!context) return;
    context.fillStyle = "#000";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#fff";
    context.font = face;
    context.textAlign = "center";
    context.textBaseline = "middle";
    for (let digit = 0; digit < 10; digit += 1) {
      context.fillText(
        String(digit),
        cell.width * (digit + 0.5),
        cell.height * 0.54,
      );
    }
    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE0 + UNIT.digits);
    gl.bindTexture(gl.TEXTURE_2D, this.digits);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.activeTexture(gl.TEXTURE0);
    this.loop.wake();
  }

  private fetchLoupe(now: number): void {
    const { at, index } = this.loupeWant;
    if (index === this.loupeAt || index < 0 || this.loupeAbort) return;
    if (now - at < LOUPE_WAIT_MS) return;
    const src = tmdbImageUrl("poster", this.films[index]!.posterPath, "w780");
    if (!src) return;
    const abort = new AbortController();
    this.loupeAbort = abort;
    void loadBitmap(src, { ...LOUPE, signal: abort.signal }).then((bitmap) => {
      if (this.loupeAbort === abort) this.loupeAbort = null;
      if (!bitmap || this.disposed || this.gl.isContextLost()) {
        bitmap?.close();
        return;
      }
      if (this.loupeWant.index === index) {
        const gl = this.gl;
        gl.activeTexture(gl.TEXTURE0 + UNIT.loupe);
        gl.bindTexture(gl.TEXTURE_2D, this.loupe);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.RGBA,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          bitmap,
        );
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.activeTexture(gl.TEXTURE0);
        this.loupeAt = index;
        this.loupeMix = 0;
      }
      bitmap.close();
      this.loop.wake();
    });
  }

  private frame(now: number, dt: number): boolean {
    const gl = this.gl;
    if (gl.isContextLost()) return false;
    fitCanvas(this.canvas, 2);
    this.width = Math.max(1, this.canvas.clientWidth);
    this.height = Math.max(1, this.canvas.clientHeight);
    this.pitch = this.height * (this.width / this.height < 0.9 ? 0.15 : 0.2);
    const ratio = this.canvas.width / this.width;
    const ms = now * 1000;
    const reduced = this.reduced;

    // The opening.
    if (
      !this.started &&
      (this.loaded >= Math.min(this.count, OPEN_READY) ||
        performance.now() - this.born > OPEN_PATIENCE_MS)
    ) {
      this.started = true;
    }
    if (this.started) {
      this.lamp = reduced ? 1 : Math.min(1, this.lamp + dt / LAMP_S);
      if (this.lamp >= WAVE_AT) {
        this.open = reduced ? 1 : Math.min(1, this.open + dt / WAVE_S);
      }
      if (this.open >= 1) {
        this.numbers = reduced ? 1 : Math.min(1, this.numbers + dt / NUMBERS_S);
      }
      if (!this.opened && this.numbers >= 1) {
        this.opened = true;
        this.events.opened();
      }
    }

    // The pan: a glide to a picked film, the wheel's turns, or inertia.
    let moving = false;
    if (this.glide && !this.held) {
      const [gx, gy] = this.glide;
      this.offset = [
        approach(this.offset[0], gx, GLIDE_S, dt),
        approach(this.offset[1], gy, GLIDE_S, dt),
      ];
      if (Math.hypot(gx - this.offset[0], gy - this.offset[1]) < 0.001) {
        this.offset = [gx, gy];
        this.glide = null;
      }
      moving = true;
    } else if (!this.held) {
      const take = 1 - Math.exp(-dt / WHEEL_S);
      const step: Vec2 = [this.pending[0] * take, this.pending[1] * take];
      this.offset[0] += step[0] + this.velocity[0] * dt;
      this.offset[1] += step[1] + this.velocity[1] * dt;
      this.pending[0] -= step[0];
      this.pending[1] -= step[1];
      const decay = Math.exp(-INERTIA * dt);
      this.velocity = [this.velocity[0] * decay, this.velocity[1] * decay];
      if (Math.hypot(...this.velocity) < 0.01) this.velocity = [0, 0];
      if (Math.hypot(...this.pending) < 0.0005) this.pending = [0, 0];
      moving =
        this.velocity[0] !== 0 ||
        this.velocity[1] !== 0 ||
        this.pending[0] !== 0 ||
        this.pending[1] !== 0;
    }

    // The magnifier and the lamp ride with the hand once the wall is up.
    const hand = this.hand;
    const present = hand !== null && this.open >= 1 && !reduced;
    const aim: Vec2 = present
      ? [
          (hand.x - this.width / 2) / this.height,
          (hand.y - this.height / 2) / this.height,
        ]
      : [0, 0];
    this.focus = [
      approach(this.focus[0], aim[0], 0.45, dt),
      approach(this.focus[1], aim[1], 0.45, dt),
    ];
    this.lampAt = [
      approach(this.lampAt[0], aim[0], 1.3, dt),
      approach(this.lampAt[1], aim[1], 1.3, dt),
    ];
    this.lens = approach(this.lens, present ? LENS.near : LENS.rest, 1.2, dt);
    const view = this.view();

    const hover =
      hand && !this.held && this.opened
        ? filmAt(wallAt(view, hand.x, hand.y), this.count)
        : -1;
    if (hover !== this.hover) {
      this.hover = hover;
      this.events.hovered(hover);
    }

    // Each print's look, eased.
    let easing = false;
    const marks = this.marks;
    for (let i = 0; i < this.count; i += 1) {
      const look = this.looks[i]!;
      const lift = i === hover ? 1 : i === this.selected ? 0.55 : 0;
      const seen = marks?.[i]?.seen ? 1 : 0;
      const match = marks?.[i]?.match === false ? 0 : 1;
      look.lift = approach(look.lift, lift, 0.45, dt);
      look.seen = approach(look.seen, seen, 0.6, dt);
      look.match = approach(look.match, match, 0.7, dt);
      easing ||=
        Math.abs(look.lift - lift) > 0.002 ||
        Math.abs(look.match - match) > 0.002;
    }

    // New prints: rebuild the mips now and then, then fade each in.
    gl.activeTexture(gl.TEXTURE0 + UNIT.prints);
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, this.prints);
    if (this.dirtySince && ms - this.dirtySince > MIP_EVERY_MS) {
      gl.generateMipmap(gl.TEXTURE_2D_ARRAY);
      this.dirtySince = 0;
      this.arrived.forEach((at, i) => {
        if (at === Number.POSITIVE_INFINITY) this.arrived[i] = ms;
      });
    }
    let arriving = this.dirtySince !== 0;
    for (let i = 0; i < this.count; i += 1) {
      const at = this.arrived[i]!;
      const shown = Number.isFinite(at)
        ? Math.min(1, (ms - at) / 1000 / ARRIVE_S)
        : 0;
      arriving ||= Number.isFinite(at) && shown < 1;
      const look = this.looks[i]!;
      this.state.set([shown, look.seen, look.lift, look.match], i * 4);
    }

    // The sharp print for the film in hand, fetched once the hand rests.
    const want = this.opened ? (hover >= 0 ? hover : this.selected) : -1;
    if (want !== this.loupeWant.index) {
      this.loupeWant = { at: performance.now(), index: want };
      if (this.loupeAt !== want) this.loupeMix = 0;
    }
    this.fetchLoupe(performance.now());
    const loupeHeld = this.loupeAt >= 0 && this.loupeAt === want;
    if (loupeHeld)
      this.loupeMix = Math.min(1, this.loupeMix + dt / LOUPE_FADE_S);
    const loupeWaiting =
      want >= 0 &&
      (!loupeHeld || this.loupeMix < 1) &&
      this.loupeAbort !== null;

    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.useProgram(this.program);
    const u = this.u;
    const ease = (t: number) => t * t * (3 - 2 * t);
    gl.uniform2f(u.uRes, this.canvas.width, this.canvas.height);
    gl.uniform1f(u.uPitch, this.pitch * ratio);
    gl.uniform2f(u.uPan, view.pan[0], view.pan[1]);
    gl.uniform2f(u.uFocus, this.focus[0], this.focus[1]);
    gl.uniform1f(u.uLens, this.lens);
    gl.uniform1f(u.uRadius, RADIUS);
    gl.uniform1f(u.uBulge, BULGE);
    gl.uniform3f(u.uLamp, this.lampAt[0], this.lampAt[1], ease(this.lamp));
    gl.uniform4fv(u.uState, this.state);
    gl.uniform1fv(u.uRank, this.rank);
    gl.uniform1f(u.uCount, this.count);
    gl.uniform1f(u.uMarks, marks ? 1 : 0);
    gl.uniform1f(u.uSelected, this.opened ? this.selected : -1);
    gl.uniform1f(u.uOpen, this.open);
    gl.uniform1f(u.uNumbers, ease(this.numbers));
    gl.uniform1f(u.uTime, reduced ? 0 : now);
    gl.uniform1f(u.uLoupeIndex, loupeHeld ? this.loupeAt : -1);
    gl.uniform1f(u.uLoupeMix, loupeHeld ? ease(this.loupeMix) : 0);
    gl.activeTexture(gl.TEXTURE0 + UNIT.loupe);
    gl.bindTexture(gl.TEXTURE_2D, this.loupe);
    gl.activeTexture(gl.TEXTURE0 + UNIT.digits);
    gl.bindTexture(gl.TEXTURE_2D, this.digits);
    gl.activeTexture(gl.TEXTURE0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    const chasing =
      Math.hypot(aim[0] - this.focus[0], aim[1] - this.focus[1]) > 1e-4 ||
      Math.hypot(aim[0] - this.lampAt[0], aim[1] - this.lampAt[1]) > 1e-4 ||
      Math.abs(this.lens - (present ? LENS.near : LENS.rest)) > 1e-4;
    const opening = !this.opened;
    return (
      opening ||
      moving ||
      chasing ||
      easing ||
      arriving ||
      loupeWaiting ||
      (loupeHeld && this.loupeMix < 1) ||
      this.held !== null
    );
  }
}
