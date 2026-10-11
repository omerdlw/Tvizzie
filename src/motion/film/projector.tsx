"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
} from "react";
import {
  cancelFrame,
  frame,
  motion,
  useReducedMotion,
  useTransform,
} from "motion/react";
import { useTheme } from "@omerdlw/base-framework/theme";
import { cn } from "@omerdlw/base-framework/utils";
import { BACKDROP_HERO_MASK } from "../../ui/backdrop-hero";
import { primitivesTheme } from "../../ui/theme";
import { useScrollY } from "../scroll";
import {
  bindFullscreen,
  createProgram,
  fitCanvas,
  readable,
  uniforms,
} from "./gl";
import { pointerFromCentre, pointerSample, watchPointer } from "./pointer";

const FRAGMENT = `#version 300 es
precision highp float;
uniform sampler2D uImage;
uniform sampler2D uLevel1;
uniform sampler2D uLevel2;
uniform sampler2D uLevel3;
uniform sampler2D uHalo;
uniform vec2 uCanvas;
uniform vec2 uImageSize;
uniform vec2 uFocus;
uniform vec2 uWeave;
uniform vec2 uParallax;
uniform vec2 uPool;
uniform vec2 uMotion;
uniform float uRack;
uniform float uDefocus;
uniform float uVelocity;
uniform float uHalation;
uniform float uFlicker;
uniform float uGrain;
uniform vec4 uDust[3];
uniform vec3 uScratch;
in vec2 vUv;
out vec4 outColor;

const float OVERSCAN = 1.07;
const float DRAIN = 0.94;

vec2 cover(vec2 uv) {
  float canvasAspect = uCanvas.x / uCanvas.y;
  float imageAspect = uImageSize.x / uImageSize.y;
  vec2 visible = canvasAspect > imageAspect
    ? vec2(1.0, imageAspect / canvasAspect)
    : vec2(canvasAspect / imageAspect, 1.0);
  visible /= OVERSCAN * (1.0 + uRack * 0.012);
  return uFocus * (1.0 - visible) + uv * visible;
}

float hash(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * 0.1031);
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}

// The picture's slopes, taken once outside any branch: the focus now differs
// from pixel to pixel, and sampling a mipmapped texture inside a branch whose
// edge cuts through a 2x2 block of pixels would draw that edge as a seam.
vec2 slopeX;
vec2 slopeY;

vec3 look(sampler2D source, vec2 st) {
  return textureGrad(source, st, slopeX, slopeY).rgb;
}

vec3 pic(vec2 st, float defocus) {
  float p = defocus * 3.0;
  if (p < 0.002) return look(uImage, st);
  if (p < 1.0) return mix(look(uImage, st), look(uLevel1, st), p);
  if (p < 2.0) return mix(look(uLevel1, st), look(uLevel2, st), p - 1.0);
  return mix(look(uLevel2, st), look(uLevel3, st), min(p - 2.0, 1.0));
}

void main() {
  vec2 uv = vUv + uWeave / uCanvas;

  // The camera turns with the hand: the frame slides, and the side it turns
  // towards comes a little nearer.
  vec2 centred = uv - 0.5;
  centred /= 1.0 + dot(centred, uParallax * vec2(0.05, 0.035));
  uv = centred + 0.5;
  float depth = mix(0.35, 1.0, vUv.y);
  uv -= uParallax * depth * vec2(0.02, 0.012);
  vec2 st = cover(uv);
  slopeX = dFdx(st);
  slopeY = dFdy(st);

  // A focus puller follows the cursor: sharp where it rests, the rest of the
  // frame falls away from it, and the light gathers round it.
  float aspect = uCanvas.x / uCanvas.y;
  float reach = length((vUv - uPool) * vec2(aspect, 1.0));
  float away = smoothstep(0.1, 0.6, reach) * uRack;
  float pool = (1.0 - smoothstep(0.0, 0.5, reach)) * uRack;

  float focus = uDefocus + away * 0.2;

  vec3 color;
  float shutter = length(uMotion);
  if (shutter > 0.0003) {
    color = vec3(0.0);
    for (int i = 0; i < 9; i++) {
      color += pic(st + uMotion * (float(i) / 8.0 - 0.5), focus);
    }
    color /= 9.0;
  } else {
    color = pic(st, focus);
  }

  float split = uVelocity * 0.007 + shutter * 0.6;
  if (split > 0.0002) {
    vec2 outward = st - vec2(0.5);
    color.r = pic(st + outward * split, focus).r;
    color.b = pic(st - outward * split, focus).b;
  }

  // Light from the brightest parts, blurred once into its own picture; it
  // swells out of focus and where the cursor rests.
  float halo = dot(texture(uHalo, st).rgb, vec3(0.3333));
  color += vec3(1.0, 0.36, 0.16) * halo * uHalation * (1.0 + away * 0.9 + pool * 0.6);

  // Anamorphic streaks: the highlights near the cursor are drawn out sideways.
  if (pool > 0.002) {
    vec3 streak = vec3(0.0);
    float total = 0.0;
    for (int i = -12; i <= 12; i++) {
      float f = float(i) / 12.0;
      float w = exp(-abs(f) * 3.0);
      streak += texture(uHalo, st + vec2(f * 0.24, 0.0)).rgb * w;
      total += w;
    }
    float lit = dot(streak / total, vec3(0.3333));
    color += vec3(0.32, 0.6, 1.0) * lit * pool * pool * 7.0;
  }

  float grey = dot(color, vec3(0.299, 0.587, 0.114));
  color = mix(color, vec3(grey), uDefocus * DRAIN + away * 0.12);

  // A pool of warm light under the cursor; the rest of the room gives way.
  float lift = pool * pool;
  color *= 1.0 + lift * 0.2 - (uRack - pool) * 0.07;
  color += vec3(1.0, 0.5, 0.2) * grey * lift * 0.05;

  // Grain, in the picture only and at the canvas's own pixels: still, like the
  // room's, so the picture moves under it and it never boils; strongest in
  // the mid-tones, as on film, and still there in the shadows.
  vec2 cell = floor(gl_FragCoord.xy);
  float n = hash(cell) * 0.7 + hash(floor(cell / 2.0) + 17.0) * 0.3 - 0.5;
  float luma = dot(color, vec3(0.299, 0.587, 0.114));
  color += n * uGrain * (0.6 + 0.4 * (1.0 - abs(luma * 2.0 - 1.0)));

  for (int i = 0; i < 3; i++) {
    vec4 dust = uDust[i];
    if (dust.w <= 0.0) continue;
    vec2 d = (vUv - dust.xy) * vec2(aspect, 1.0);
    color *= 1.0 - smoothstep(dust.z, dust.z * 0.35, length(d)) * dust.w;
  }
  if (uScratch.y > 0.0) {
    float x = uScratch.x + sin(vUv.y * 9.0 + uScratch.z) * 0.002;
    color += smoothstep(1.5 / uCanvas.x, 0.0, abs(vUv.x - x)) * uScratch.y;
  }

  outColor = vec4(color * uFlicker, 1.0);
}`;

const BLUR = `#version 300 es
precision mediump float;
uniform sampler2D uSource;
uniform vec2 uStep;
uniform float uThreshold;
in vec2 vUv;
out vec4 outColor;

vec3 read(vec2 uv) {
  vec3 c = texture(uSource, uv).rgb;
  return uThreshold >= 0.0 ? max(c - uThreshold, 0.0) : c;
}

void main() {
  // Drawn into a texture the picture's top row is the first, not the last.
  vec2 uv = vec2(vUv.x, 1.0 - vUv.y);
  vec3 c = read(uv) * 0.2270270270;
  c += (read(uv + uStep * 1.3846153846) + read(uv - uStep * 1.3846153846)) * 0.3162162162;
  c += (read(uv + uStep * 3.2307692308) + read(uv - uStep * 3.2307692308)) * 0.0702702703;
  outColor = vec4(c, 1.0);
}`;

const LEVEL_WIDTHS = [960, 320, 110] as const;
const HALO_WIDTH = 320;
const HALO_FROM = 0.62;
const BLUR_ROUNDS = 2;

const NAMES = [
  "uImage",
  "uLevel1",
  "uLevel2",
  "uLevel3",
  "uHalo",
  "uCanvas",
  "uImageSize",
  "uFocus",
  "uWeave",
  "uParallax",
  "uPool",
  "uMotion",
  "uRack",
  "uDefocus",
  "uVelocity",
  "uHalation",
  "uFlicker",
  "uGrain",
  "uDust",
  "uScratch",
] as const;

const GRAIN = 0.18;

interface Speck {
  life: number;
  size: number;
  strength: number;
  x: number;
  y: number;
}

interface Mass {
  vx: number;
  vy: number;
  x: number;
  y: number;
}

function pull(
  mass: Mass,
  tx: number,
  ty: number,
  dt: number,
  stiffness: number,
  damping: number,
) {
  mass.vx += ((tx - mass.x) * stiffness - mass.vx * damping) * dt;
  mass.vy += ((ty - mass.y) * stiffness - mass.vy * damping) * dt;
  mass.x += mass.vx * dt;
  mass.y += mass.vy * dt;
}

const FRAME_MS = 1000 / 24;
const CAMERA = { damping: 8.6, stiffness: 48 };
const LENS = { damping: 21.5, stiffness: 160 };
const LINGER = 4000;
const SHUTTER: [number, number] = [0.0026, 0.0016];
const SHUTTER_MAX = 0.012;
const MAX_TEXTURE = 2560;
const DEVICE_CAP = 1.5;
const FAST = 4200;

const KEYWORDS: Record<string, number> = {
  bottom: 1,
  center: 0.5,
  left: 0,
  right: 1,
  top: 0,
};

function parsePosition(position: string): [number, number] {
  const [x = "center", y = "center"] = position.trim().split(/\s+/);
  const read = (value: string) =>
    value.endsWith("%")
      ? Number.parseFloat(value) / 100
      : (KEYWORDS[value] ?? 0.5);
  return [read(x), read(y)];
}

interface Options {
  defocusAt: RefObject<((y: number) => number) | undefined>;
  focus: [number, number];
  halation: number;
  onFail: () => void;
  onLive: (live: boolean) => void;
  onRestore: () => void;
  reduced: boolean;
  scrollY: ReturnType<typeof useScrollY>;
}

function project(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  {
    defocusAt,
    focus,
    halation,
    onFail,
    onLive,
    onRestore,
    reduced,
    scrollY,
  }: Options,
): () => void {
  const gl = canvas.getContext("webgl2", {
    alpha: false,
    antialias: false,
    depth: false,
    powerPreference: "high-performance",
    stencil: false,
  });
  if (!gl) {
    onFail();
    return () => {};
  }
  const program = createProgram(gl, FRAGMENT);
  if (!program) {
    onFail();
    return () => {};
  }
  gl.useProgram(program);
  const mainVao = gl.createVertexArray();
  gl.bindVertexArray(mainVao);
  bindFullscreen(gl, program);
  const u = uniforms(gl, program, NAMES);
  const texture = gl.createTexture();

  let size: [number, number] = [1, 1];
  let ready = false;
  let softened: WebGLTexture[] = [];
  let disposed = false;
  let lost = false;
  let visible = true;
  let running = false;
  let resized = true;
  let tick = -1;
  let weave: [number, number] = [0, 0];
  let parallax: [number, number] = [0, 0];
  let shutter: [number, number] = [0, 0];
  let rack = 0;
  let poolAt: [number, number] = [0.5, 0.5];
  let scrolled = scrollY.get();
  const camera: Mass = { vx: 0, vy: 0, x: 0, y: 0 };
  const lens: Mass = { vx: 0, vy: 0, x: 0, y: 0 };
  let lensSeen = false;
  let velocity = 0;
  let defocus = -1;
  let flicker = 1;
  const dust: Speck[] = [];
  let scratch: {
    life: number;
    strength: number;
    wobble: number;
    x: number;
  } | null = null;

  const advance = () => {
    for (let i = dust.length - 1; i >= 0; i--) {
      if (--dust[i].life <= 0) dust.splice(i, 1);
    }
    if (dust.length < 3 && Math.random() < 1 / 48) {
      dust.push({
        life: 1 + Math.round(Math.random()),
        size: 0.002 + Math.random() * 0.004,
        strength: 0.35 + Math.random() * 0.35,
        x: Math.random(),
        y: Math.random(),
      });
    }
    if (scratch && --scratch.life <= 0) scratch = null;
    if (!scratch && Math.random() < 1 / 220) {
      scratch = {
        life: 6 + Math.round(Math.random() * 8),
        strength: 0.06 + Math.random() * 0.05,
        wobble: Math.random() * 6,
        x: 0.1 + Math.random() * 0.8,
      };
    } else if (scratch) {
      scratch.x += (Math.random() - 0.5) * 0.0015;
    }
  };

  const draw = () => {
    if (resized) {
      fitCanvas(canvas, DEVICE_CAP);
      gl.viewport(0, 0, canvas.width, canvas.height);
      resized = false;
    }
    gl.uniform1i(u.uImage, 0);
    gl.uniform1i(u.uLevel1, 1);
    gl.uniform1i(u.uLevel2, 2);
    gl.uniform1i(u.uLevel3, 3);
    gl.uniform1i(u.uHalo, 4);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    softened.forEach((target, index) => {
      gl.activeTexture(gl.TEXTURE1 + index);
      gl.bindTexture(gl.TEXTURE_2D, target);
    });
    gl.uniform2f(u.uCanvas, canvas.width, canvas.height);
    gl.uniform2f(u.uImageSize, size[0], size[1]);
    gl.uniform2f(u.uFocus, focus[0], focus[1]);
    gl.uniform2f(u.uWeave, weave[0], weave[1]);
    gl.uniform2f(u.uParallax, parallax[0], parallax[1]);
    if (rack > 0.001) {
      const box = canvas.getBoundingClientRect();
      poolAt = [
        (lens.x - box.left) / box.width,
        (lens.y - box.top) / box.height,
      ];
    }
    gl.uniform2f(u.uPool, poolAt[0], poolAt[1]);
    gl.uniform2f(u.uMotion, shutter[0], shutter[1]);
    gl.uniform1f(u.uRack, rack);
    gl.uniform1f(u.uDefocus, Math.max(0, defocus));
    gl.uniform1f(u.uVelocity, velocity);
    gl.uniform1f(u.uHalation, halation);
    gl.uniform1f(u.uFlicker, flicker);
    gl.uniform1f(u.uGrain, GRAIN);
    const specks = new Float32Array(12);
    dust.forEach((speck, index) =>
      specks.set([speck.x, speck.y, speck.size, speck.strength], index * 4),
    );
    gl.uniform4fv(u.uDust, specks);
    gl.uniform3f(
      u.uScratch,
      scratch?.x ?? 0,
      scratch?.strength ?? 0,
      scratch?.wobble ?? 0,
    );
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  const step = ({ delta, timestamp }: { delta: number; timestamp: number }) => {
    if (!ready) return;
    let dirty = resized;

    const nextDefocus = reduced ? 0 : (defocusAt.current?.(scrollY.get()) ?? 0);
    if (Math.abs(nextDefocus - defocus) > 0.0005) {
      defocus = nextDefocus;
      dirty = true;
    }

    if (!reduced) {
      const now = Math.floor(timestamp / FRAME_MS);
      if (now !== tick) {
        tick = now;
        const settled = Math.abs(scrollY.getVelocity()) < 40 && defocus < 0.05;
        const amount = settled ? 1 : 0;
        weave = [
          weave[0] * 0.55 + (Math.random() - 0.5) * 0.9 * amount,
          weave[1] * 0.55 + (Math.random() - 0.5) * 0.6 * amount,
        ];
        if (!settled && Math.abs(weave[0]) + Math.abs(weave[1]) < 0.01) {
          weave = [0, 0];
        }
        flicker = 1 + (Math.random() - 0.5) * 0.022;
        advance();
        dirty = dirty || defocus < 0.98;
      }

      const dt = Math.min(delta / 1000, 1 / 30);
      const sample = pointerSample();
      const [px, py] = pointerFromCentre();

      // The camera has weight: it leans after the hand and settles with a
      // little overshoot, and a quick flick leaves a smear of motion.
      pull(camera, px, py, dt, CAMERA.stiffness, CAMERA.damping);
      const [ax, ay] = [
        Math.max(-1.15, Math.min(1.15, camera.x)),
        Math.max(-1.15, Math.min(1.15, camera.y)),
      ];
      const swing = Math.abs(camera.vx) + Math.abs(camera.vy);
      const nextShutter: [number, number] = [
        Math.max(-SHUTTER_MAX, Math.min(SHUTTER_MAX, camera.vx * SHUTTER[0])),
        Math.max(-SHUTTER_MAX, Math.min(SHUTTER_MAX, camera.vy * SHUTTER[1])),
      ];
      if (
        Math.abs(ax - parallax[0]) + Math.abs(ay - parallax[1]) > 1e-5 ||
        swing > 1e-3 ||
        shutter[0] !== 0 ||
        shutter[1] !== 0
      ) {
        parallax = [ax, ay];
        shutter =
          Math.abs(nextShutter[0]) + Math.abs(nextShutter[1]) < 2e-4
            ? [0, 0]
            : nextShutter;
        dirty = true;
      }

      // The focus puller: the lens follows the cursor a beat behind, holds
      // while it moves, and lets go when the hand has been still a while.
      if (sample.present && !lensSeen) {
        lens.x = sample.x;
        lens.y = sample.y;
        lensSeen = true;
      }
      const alive = sample.present && timestamp - sample.at < LINGER;
      if (lensSeen && sample.present) {
        pull(lens, sample.x, sample.y, dt, LENS.stiffness, LENS.damping);
      }
      const nextRack =
        rack +
        ((alive ? 1 : 0) - rack) * (1 - Math.exp(-dt * (alive ? 5 : 1.6)));
      const nowScrolled = scrollY.get();
      if (
        Math.abs(nextRack - rack) > 5e-4 ||
        (rack > 0.001 &&
          (Math.abs(lens.vx) + Math.abs(lens.vy) > 0.05 ||
            nowScrolled !== scrolled))
      ) {
        rack = nextRack < 0.002 && !alive ? 0 : nextRack;
        dirty = true;
      }
      scrolled = nowScrolled;

      const speed = Math.min(1, Math.abs(scrollY.getVelocity()) / FAST);
      const nextVelocity = velocity + (speed - velocity) * 0.18;
      if (Math.abs(nextVelocity - velocity) > 1e-4 || nextVelocity > 0.002) {
        velocity = nextVelocity < 0.002 ? 0 : nextVelocity;
        dirty = true;
      }
    }

    if (dirty) draw();
  };

  const run = () => {
    const should = ready && visible && !document.hidden;
    if (should && !running) {
      running = true;
      frame.render(step, true);
    } else if (!should && running) {
      running = false;
      cancelFrame(step);
    }
  };

  const bake = (size: readonly [number, number]) => {
    const blur = createProgram(gl, BLUR);
    if (!blur) return null;
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    gl.useProgram(blur);
    bindFullscreen(gl, blur);
    const b = uniforms(gl, blur, ["uSource", "uStep", "uThreshold"] as const);
    const framebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.uniform1i(b.uSource, 0);
    gl.activeTexture(gl.TEXTURE0);

    const made: WebGLTexture[] = [];
    const empty = (width: number, height: number) => {
      const target = gl.createTexture();
      made.push(target);
      gl.bindTexture(gl.TEXTURE_2D, target);
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
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      return target;
    };
    const pass = (
      from: WebGLTexture,
      to: WebGLTexture,
      width: number,
      height: number,
      along: [number, number],
      threshold: number,
    ) => {
      gl.framebufferTexture2D(
        gl.FRAMEBUFFER,
        gl.COLOR_ATTACHMENT0,
        gl.TEXTURE_2D,
        to,
        0,
      );
      gl.viewport(0, 0, width, height);
      gl.bindTexture(gl.TEXTURE_2D, from);
      gl.uniform2f(b.uStep, along[0] / width, along[1] / height);
      gl.uniform1f(b.uThreshold, threshold);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    const soften = (
      from: WebGLTexture,
      width: number,
      keep: number,
    ): WebGLTexture => {
      const height = Math.max(1, Math.round((width * size[1]) / size[0]));
      const a = empty(width, height);
      const c = empty(width, height);
      let source = from;
      let threshold = keep;
      for (let round = 0; round < BLUR_ROUNDS; round++) {
        pass(source, a, width, height, [1, 0], threshold);
        pass(a, c, width, height, [0, 1], -1);
        source = c;
        threshold = -1;
      }
      return c;
    };

    const levels: WebGLTexture[] = [];
    let from = texture;
    for (const width of LEVEL_WIDTHS) {
      from = soften(from, Math.min(width, size[0]), -1);
      levels.push(from);
    }
    const halo = soften(levels[0], Math.min(HALO_WIDTH, size[0]), HALO_FROM);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.deleteFramebuffer(framebuffer);
    gl.bindVertexArray(mainVao);
    gl.useProgram(program);
    gl.deleteProgram(blur);
    gl.deleteVertexArray(vao);
    const kept = new Set([...levels, halo]);
    for (const target of made) if (!kept.has(target)) gl.deleteTexture(target);
    return { halo, levels };
  };

  const upload = async () => {
    try {
      await image.decode();
    } catch {
      if (!disposed) onFail();
      return;
    }
    if (disposed) return;
    if (!image.naturalWidth) return onFail();
    const width = Math.min(image.naturalWidth, MAX_TEXTURE);
    const source: ImageBitmap | HTMLImageElement =
      width < image.naturalWidth && typeof createImageBitmap === "function"
        ? await createImageBitmap(image, {
            resizeHeight: Math.round(
              (image.naturalHeight * width) / image.naturalWidth,
            ),
            resizeQuality: "high",
            resizeWidth: width,
          })
        : image;
    if (disposed || lost || gl.isContextLost()) {
      if (source instanceof ImageBitmap) source.close();
      return;
    }
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(
      gl.TEXTURE_2D,
      gl.TEXTURE_MIN_FILTER,
      gl.LINEAR_MIPMAP_LINEAR,
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    size = [source.width, source.height];
    if (source instanceof ImageBitmap) source.close();
    const baked = bake(size);
    if (!baked || lost || gl.isContextLost()) return;
    softened = [...baked.levels, baked.halo];
    resized = true;
    ready = true;
    defocus = reduced ? 0 : (defocusAt.current?.(scrollY.get()) ?? 0);
    draw();
    onLive(true);
    run();
  };

  const sight = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    run();
  });
  sight.observe(canvas);
  const box = new ResizeObserver(() => {
    resized = true;
    if (ready && !running) draw();
  });
  box.observe(canvas);
  const onVisibility = () => run();
  document.addEventListener("visibilitychange", onVisibility);
  const onLost = (event: Event) => {
    event.preventDefault();
    lost = true;
    ready = false;
    run();
    onLive(false);
  };
  const onRestored = () => onRestore();
  canvas.addEventListener("webglcontextlost", onLost);
  canvas.addEventListener("webglcontextrestored", onRestored);
  const releasePointer = reduced ? () => {} : watchPointer();

  void upload();

  return () => {
    disposed = true;
    ready = false;
    run();
    sight.disconnect();
    box.disconnect();
    releasePointer();
    document.removeEventListener("visibilitychange", onVisibility);
    canvas.removeEventListener("webglcontextlost", onLost);
    canvas.removeEventListener("webglcontextrestored", onRestored);
    gl.deleteTexture(texture);
    softened.forEach((target) => gl.deleteTexture(target));
    gl.deleteProgram(program);
    gl.deleteVertexArray(mainVao);
  };
}

interface ProjectionProps {
  className?: string;
  defocusAt?: (scrollY: number) => number;
  halation?: number;
  mask?: CSSProperties;
  onReady?: () => void;
  position?: string;
  src: string;
}

export function Projection({
  className,
  defocusAt,
  halation = 0.55,
  mask = BACKDROP_HERO_MASK,
  onReady,
  position = "center 20%",
  src,
}: ProjectionProps) {
  const theme = useTheme(primitivesTheme);
  const reduced = Boolean(useReducedMotion());
  const scrollY = useScrollY();
  const image = useRef<HTMLImageElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const focusRef = useRef(defocusAt);
  const readyRef = useRef(onReady);
  const [live, setLive] = useState(false);
  const [plain, setPlain] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const softened = useTransform(scrollY, (y) => {
    const amount = reduced ? 0 : (focusRef.current?.(y) ?? 0);
    return amount < 0.002
      ? "none"
      : `blur(${(amount * 14).toFixed(2)}px) saturate(${(1 - amount * 0.35).toFixed(3)})`;
  });

  useEffect(() => {
    focusRef.current = defocusAt;
    readyRef.current = onReady;
  }, [defocusAt, onReady]);

  useEffect(() => {
    if (live) readyRef.current?.();
  }, [live]);

  useEffect(() => {
    if (plain || !image.current || !canvas.current) return;
    const [x, y] = parsePosition(position);
    const stop = project(canvas.current, image.current, {
      defocusAt: focusRef,
      focus: [x, y],
      halation,
      onFail: () => setPlain(true),
      onLive: setLive,
      onRestore: () => setAttempt((count) => count + 1),
      reduced,
      scrollY,
    });
    return () => {
      stop();
      setLive(false);
    };
  }, [attempt, halation, plain, position, reduced, scrollY, src]);

  return (
    <div
      aria-hidden="true"
      className={cn(theme.slots.backdropHero, className)}
      data-cursor-stage=""
    >
      <div className="absolute inset-0" style={mask}>
        <motion.img
          alt=""
          className="absolute inset-0 size-full object-cover"
          crossOrigin={plain ? undefined : "anonymous"}
          decoding="async"
          fetchPriority="high"
          key={plain ? "plain" : "read"}
          onError={() => {
            if (plain) onReady?.();
            else setPlain(true);
          }}
          onLoad={plain ? onReady : undefined}
          ref={image}
          src={plain ? src : readable(src)}
          style={{
            filter: live ? undefined : softened,
            objectPosition: position,
            visibility: live ? "hidden" : undefined,
          }}
        />
        {plain ? null : (
          <canvas
            className="absolute inset-0 size-full"
            ref={canvas}
            style={{ opacity: live ? 1 : 0 }}
          />
        )}
      </div>
    </div>
  );
}
