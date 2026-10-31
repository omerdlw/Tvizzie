import {
  bindFullscreen,
  createProgram,
  createTexture,
  fitCanvas,
  uniforms,
} from "@/motion/gl";
import { clamp } from "@/motion/math";
import { Bloom } from "../bloom";
import { loadBitmap } from "../bitmap";
import { approach, createLoop, type Loop } from "../loop";
import { FOUNDRY_FRAGMENT } from "./shader";

const NAMES = [
  "uRes",
  "uPlate",
  "uTilt",
  "uLight",
  "uTime",
  "uMelt",
  "uCool",
  "uHeat",
  "uPoster",
  "uEngrave",
  "uLamp",
  "uReveal",
  "uFill",
  "uCut",
] as const;

const POSTER = { height: 900, width: 600 };
// The opening, beat by beat: the lamp, the frame, the pour.
const LAMP_S = 1.6;
const LAMP_AT = 0.7;
const REVEAL_S = 1.6;
const FILL_S = 2.4;
// Every cast, the first and each change: melt, set, then the year is cut.
const MELT_S = 0.75;
const CAST_S = 1.5;
const HEAT_S = 2.6;
const SET_S = 2.4;
const CUT_S = 1.3;
const TILT = 0.07;
const LOOK = { amount: 0.28, grain: 0.03, threshold: 1.4, vignette: 0.5 };
// The lamp rakes across the plate from just above its face, so the flat
// field never mirrors it; only the relief's slopes catch a line of light.
const REST_LIGHT: [number, number, number] = [-1.1, 1.9, 0.8];
const REACH = 2.2;
// The engraving's mask spans the top rail: as wide as the print, as tall as
// RAIL in plate units (keep in step with the shader).
const RAIL = 0.13;
const ENGRAVE_WIDTH = 2048;

interface Plate {
  aspect: number;
  centerX: number;
  centerY: number;
  half: number;
}

export interface FoundryEvents {
  /** The opening has run to its last beat: the year is cut. */
  opened(): void;
}

// Drives the foundry shader. The opening waits in the dark until the first
// print is in hand, then runs its beats one after another, each waiting on
// the last: lamp, frame, pour, cast, set, cut. After that it melts the
// plate whenever the wanted film changes, holds it liquid until that poster
// has arrived (so scrubbing through years keeps the metal molten), casts it
// in gold, lets the gold set into the print and cuts the year again.
export class Foundry {
  private readonly loop: Loop;
  private readonly bloom: Bloom;
  private readonly texture: WebGLTexture;
  private readonly engraving: WebGLTexture;
  private readonly u;
  private readonly bitmaps = new Map<string, Promise<ImageBitmap | null>>();
  private plate: Plate | null = null;
  private shown: string | null = null;
  private wanted: string | null = null;
  private ready: ImageBitmap | null = null;
  private label = "";
  private engraved: string | null = null;
  private melt = 1;
  private heat = 1;
  private cool = 0;
  private lamp = 0;
  private reveal = 0;
  private fill = 0;
  private cut = 0;
  private opened = false;
  private tilt: [number, number] = [0, 0];
  private tiltTo: [number, number] = [0, 0];
  private light: [number, number, number] = [...REST_LIGHT];
  private lightTo: [number, number, number] = [...REST_LIGHT];
  private reduced = false;
  private started = performance.now() / 1000;

  /** `font` is the CSS family the rail's lettering is cut in. */
  static create(
    canvas: HTMLCanvasElement,
    font: string,
    events: FoundryEvents,
  ): Foundry | null {
    const gl = canvas.getContext("webgl2", {
      alpha: false,
      antialias: false,
      powerPreference: "high-performance",
    });
    if (!gl) return null;
    const program = createProgram(gl, FOUNDRY_FRAGMENT);
    const bloom = Bloom.create(gl);
    if (!program || !bloom) return null;
    return new Foundry(canvas, gl, program, bloom, font, events);
  }

  private constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly gl: WebGL2RenderingContext,
    private readonly program: WebGLProgram,
    bloom: Bloom,
    private readonly font: string,
    private readonly events: FoundryEvents,
  ) {
    this.bloom = bloom;
    bindFullscreen(gl, program, ...bloom.programs);
    this.u = uniforms(gl, program, NAMES);
    this.texture = createTexture(gl, gl.LINEAR_MIPMAP_LINEAR);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      1,
      1,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      new Uint8Array([40, 30, 20, 255]),
    );
    this.engraving = createTexture(gl, gl.LINEAR_MIPMAP_LINEAR);
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
    this.loop = createLoop((now, dt) => this.frame(now, dt));
  }

  setReduced(reduced: boolean): void {
    this.reduced = reduced;
    this.loop.wake();
  }

  /** The plate's box in CSS pixels, relative to the canvas. */
  setPlate(x: number, y: number, width: number, height: number): void {
    const ratio = this.canvas.width / Math.max(1, this.canvas.clientWidth);
    this.plate = {
      aspect: width / height,
      centerX: (x + width / 2) * ratio,
      centerY: this.canvas.height - (y + height / 2) * ratio,
      half: (height / 2) * ratio,
    };
    this.loop.wake();
  }

  resize(): void {
    fitCanvas(this.canvas, 1.5);
    this.loop.wake();
  }

  /** Pointer in CSS pixels relative to the canvas; null when it leaves. */
  point(x: number | null, y: number | null): void {
    const plate = this.plate;
    if (!plate || x === null || y === null) {
      this.tiltTo = [0, 0];
      this.lightTo = [...REST_LIGHT];
    } else {
      const ratio = this.canvas.width / Math.max(1, this.canvas.clientWidth);
      const px = (x * ratio - plate.centerX) / plate.half;
      const py = (this.canvas.height - y * ratio - plate.centerY) / plate.half;
      // The hand only turns the lamp around the plate, never over it.
      const angle = Math.atan2(py, px);
      this.lightTo = [
        Math.cos(angle) * REACH,
        Math.sin(angle) * REACH,
        REST_LIGHT[2],
      ];
      if (!this.reduced) {
        this.tiltTo = [
          clamp(px / 3, -1, 1) * TILT,
          clamp(-py / 3, -1, 1) * TILT,
        ];
      }
    }
    this.loop.wake();
  }

  /** `label` is cut into the frame's top rail when this print is cast. */
  show(src: string, label: string, neighbours: readonly string[] = []): void {
    this.wanted = src;
    this.label = label;
    this.fetch(src).then((bitmap) => {
      if (this.wanted === src) {
        this.ready = bitmap;
        this.loop.wake();
      }
    });
    for (const next of neighbours) void this.fetch(next);
    this.loop.wake();
  }

  dispose(): void {
    this.loop.dispose();
    this.bloom.dispose();
    this.gl.deleteTexture(this.texture);
    this.gl.deleteTexture(this.engraving);
    this.gl.deleteProgram(this.program);
    this.bitmaps.clear();
  }

  private fetch(src: string): Promise<ImageBitmap | null> {
    let bitmap = this.bitmaps.get(src);
    if (!bitmap) {
      bitmap = loadBitmap(src, POSTER);
      this.bitmaps.set(src, bitmap);
    }
    return bitmap;
  }

  private upload(bitmap: ImageBitmap): void {
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bitmap);
    gl.generateMipmap(gl.TEXTURE_2D);
    void this.engrave(this.label);
  }

  // Letters as a soft-walled mask: white where the burin cut, so the shader
  // can sink them into the rail and let the lamp find their walls.
  private async engrave(label: string): Promise<void> {
    const plate = this.plate;
    if (!plate || this.engraved === label) return;
    const height = Math.round((ENGRAVE_WIDTH * RAIL) / (2 * plate.aspect));
    const size = Math.round(height * 0.8);
    const face = `700 ${size}px ${this.font}`;
    await document.fonts.load(face, label).catch(() => undefined);
    if (this.label !== label) return;
    const canvas = new OffscreenCanvas(ENGRAVE_WIDTH, height);
    const context = canvas.getContext("2d");
    if (!context) return;
    context.fillStyle = "#000";
    context.fillRect(0, 0, ENGRAVE_WIDTH, height);
    context.filter = `blur(${(height * 0.018).toFixed(2)}px)`;
    context.font = face;
    context.letterSpacing = `${Math.round(size * 0.1)}px`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillStyle = "#fff";
    context.fillText(label, ENGRAVE_WIDTH / 2, height * 0.53);
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.engraving);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
    gl.generateMipmap(gl.TEXTURE_2D);
    this.engraved = label;
    this.loop.wake();
  }

  private frame(now: number, dt: number): boolean {
    const gl = this.gl;
    const plate = this.plate;
    if (!plate) return false;
    fitCanvas(this.canvas, 1.5);

    const changing = this.wanted !== null && this.wanted !== this.shown;
    // The old year fills with the melt; the new one is cut once it sets.
    const swap = () => {
      this.upload(this.ready!);
      this.shown = this.wanted;
      this.cut = 0;
    };
    if (this.reduced) {
      if (changing && this.ready) swap();
      const on = this.shown ? 1 : 0;
      this.lamp = this.reveal = this.fill = this.cut = on;
      this.melt = 1 - on;
      this.heat = 0;
      this.cool = 1;
    } else if (this.fill < 1) {
      // The opening: nothing moves until the first print is in hand, and
      // whatever is wanted meanwhile is swapped in under the liquid.
      if (changing && this.ready) swap();
      if (this.shown) this.lamp = Math.min(1, this.lamp + dt / LAMP_S);
      if (this.lamp >= LAMP_AT) {
        this.reveal = Math.min(1, this.reveal + dt / REVEAL_S);
      }
      if (this.reveal >= 1) this.fill = Math.min(1, this.fill + dt / FILL_S);
    } else if (changing) {
      // Melt toward the wanted film, swap at full liquid, cast back down.
      this.melt = Math.min(1, this.melt + dt / MELT_S);
      if (this.melt >= 1 && this.ready) {
        swap();
        this.heat = 1;
        this.cool = 0;
      }
    } else {
      this.melt = Math.max(0, this.melt - dt / CAST_S);
      if (this.melt < 0.5) this.heat = Math.max(0, this.heat - dt / HEAT_S);
      // Once the pour has dulled, the gold sets into the print.
      if (this.heat < 0.6) this.cool = Math.min(1, this.cool + dt / SET_S);
    }
    if (this.melt === 0 && this.cool >= 1 && !changing) {
      this.cut = Math.min(1, this.cut + dt / CUT_S);
    }
    if (!this.opened && this.cut >= 1) {
      this.opened = true;
      this.events.opened();
    }
    this.tilt = [
      approach(this.tilt[0], this.tiltTo[0], 1.2, dt),
      approach(this.tilt[1], this.tiltTo[1], 1.2, dt),
    ];
    this.light = [
      approach(this.light[0], this.lightTo[0], 0.5, dt),
      approach(this.light[1], this.lightTo[1], 0.5, dt),
      approach(this.light[2], this.lightTo[2], 0.5, dt),
    ];

    const time = now - this.started;
    const width = this.canvas.width;
    const height = this.canvas.height;
    this.bloom.begin(width, height);
    gl.useProgram(this.program);
    const u = this.u;
    gl.uniform2f(u.uRes, width, height);
    gl.uniform4f(
      u.uPlate,
      plate.centerX,
      plate.centerY,
      plate.half,
      plate.aspect,
    );
    gl.uniform2f(u.uTilt, this.tilt[0], this.tilt[1]);
    gl.uniform3f(u.uLight, ...this.light);
    gl.uniform1f(u.uTime, time);
    gl.uniform1f(u.uMelt, smooth(this.melt));
    gl.uniform1f(u.uCool, smooth(this.cool));
    gl.uniform1f(u.uHeat, this.heat);
    gl.uniform1f(u.uLamp, smooth(this.lamp));
    gl.uniform1f(u.uReveal, smooth(this.reveal));
    gl.uniform1f(u.uFill, this.fill < 1 ? smooth(this.fill) : 1);
    gl.uniform1f(u.uCut, this.cut < 1 ? smooth(this.cut) : 1);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.uniform1i(u.uPoster, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.engraving);
    gl.uniform1i(u.uEngrave, 1);
    gl.activeTexture(gl.TEXTURE0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    this.bloom.present(LOOK, time);

    const settled =
      !changing &&
      this.fill === 1 &&
      this.cut === 1 &&
      this.melt === 0 &&
      this.heat === 0 &&
      this.cool === 1 &&
      Math.abs(this.tilt[0] - this.tiltTo[0]) < 1e-4 &&
      Math.abs(this.tilt[1] - this.tiltTo[1]) < 1e-4 &&
      Math.abs(this.light[0] - this.lightTo[0]) < 1e-3 &&
      Math.abs(this.light[1] - this.lightTo[1]) < 1e-3;
    // Liquid keeps moving; a still plate sleeps.
    return !settled || (changing && !this.reduced);
  }
}

const smooth = (t: number) => t * t * (3 - 2 * t);
