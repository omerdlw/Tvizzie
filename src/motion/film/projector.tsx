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
  sampleClamped,
  uniforms,
} from "../gl";
import { pointerFromCentre, pointerSample, watchPointer } from "../pointer";

const STREAK_GAIN = 2.5;

const FRAGMENT = `#version 300 es
precision highp float;
uniform sampler2D uImage;
uniform sampler2D uLevel1;
uniform sampler2D uLevel2;
uniform sampler2D uLevel3;
uniform sampler2D uHalo;
uniform sampler2D uImageB;
uniform sampler2D uLevelB1;
uniform sampler2D uLevelB2;
uniform sampler2D uLevelB3;
uniform sampler2D uHaloB;
uniform sampler2D uStreak;
uniform vec2 uCanvas;
uniform vec2 uImageSize;
uniform vec2 uImageSizeB;
uniform float uCut;
uniform vec2 uFocus;
uniform vec2 uWeave;
uniform vec2 uParallax;
uniform vec2 uPool;
uniform vec2 uPoolTrail;
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
const float STREAK_GAIN = ${STREAK_GAIN.toFixed(1)};

vec2 cover(vec2 uv, vec2 imageSize) {
  float canvasAspect = uCanvas.x / uCanvas.y;
  float imageAspect = imageSize.x / imageSize.y;
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

vec2 slopeX;
vec2 slopeY;

vec3 look(sampler2D source, vec2 st) {
  return textureGrad(source, st, slopeX, slopeY).rgb;
}

vec3 reel(
  sampler2D image,
  sampler2D level1,
  sampler2D level2,
  sampler2D level3,
  vec2 st,
  float defocus
) {
  float p = defocus * 3.0;
  if (p < 0.002) return look(image, st);
  if (p < 1.0) return mix(look(image, st), look(level1, st), p);
  if (p < 2.0) return mix(look(level1, st), look(level2, st), p - 1.0);
  return mix(look(level2, st), look(level3, st), min(p - 2.0, 1.0));
}

vec3 pic(vec2 st, float defocus) {
  return reel(uImage, uLevel1, uLevel2, uLevel3, st, defocus);
}

vec2 framed(vec2 turn) {
  vec2 centred = vUv + uWeave / uCanvas - 0.5;
  centred /= 1.0 + dot(centred, turn * vec2(0.05, 0.035));
  float depth = mix(0.35, 1.0, vUv.y);
  return centred + 0.5 - turn * depth * vec2(0.02, 0.012);
}

void main() {
  vec2 uv = framed(uParallax);
  vec2 st = cover(uv, uImageSize);
  vec2 stB = cover(uv, uImageSizeB);
  slopeX = dFdx(st);
  slopeY = dFdy(st);

  float aspect = uCanvas.x / uCanvas.y;
  vec2 here = (vUv - uPool) * vec2(aspect, 1.0);
  float reach = length(here);
  vec2 trail = -uPoolTrail * vec2(aspect, 1.0);
  float run = dot(trail, trail);
  float caught = run > 1e-8
    ? length(here - trail * clamp(dot(here, trail) / run, 0.0, 1.0))
    : reach;
  float away = smoothstep(0.1, 0.6, reach) * uRack;
  float pool = (1.0 - smoothstep(0.0, 0.5, caught)) * uRack
    / (1.0 + sqrt(run) * 1.5);

  float focus = uDefocus + away * 0.2;

  vec2 motion = st - cover(framed(uParallax - uMotion), uImageSize);
  float smear = length(motion / max(abs(vec2(slopeX.x, slopeY.y)), vec2(1e-6)));
  vec3 color;
  if (smear > 0.75) {
    float taps = clamp(ceil(smear / 2.5) + 2.0, 3.0, 16.0);
    float start = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
    float total = 0.0;
    color = vec3(0.0);
    for (int i = 0; i < 16; i++) {
      if (float(i) >= taps) break;
      float t = (float(i) + start) / taps - 0.5;
      float w = 1.0 - t * t * 2.0;
      color += pic(st + motion * t, focus) * w;
      total += w;
    }
    color /= total;
  } else {
    color = pic(st, focus);
  }

  float split = uVelocity * 0.007 + length(motion) * 0.3;
  if (split > 0.0002) {
    vec2 outward = st - vec2(0.5);
    color.r = pic(st + outward * split, focus).r;
    color.b = pic(st - outward * split, focus).b;
  }

  float halo = dot(texture(uHalo, st).rgb, vec3(0.3333));

  if (uCut > 0.0) {
    vec3 next = reel(uImageB, uLevelB1, uLevelB2, uLevelB3, stB, focus);
    color = mix(color, next, uCut);
    halo = mix(halo, dot(texture(uHaloB, stB).rgb, vec3(0.3333)), uCut);
  }
  color += vec3(1.0, 0.36, 0.16) * halo * uHalation * (1.0 + away * 0.9 + pool * 0.6);

  if (pool > 0.002) {
    float lit = texture(uStreak, st).r / STREAK_GAIN;
    color += vec3(0.32, 0.6, 1.0) * lit * pool * pool * 7.0;
  }

  float grey = dot(color, vec3(0.299, 0.587, 0.114));
  color = mix(color, vec3(grey), uDefocus * DRAIN + away * 0.12);

  float lift = pool * pool;
  color *= 1.0 + lift * 0.2 - (uRack - pool) * 0.07;
  color += vec3(1.0, 0.5, 0.2) * grey * lift * 0.05;

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
  vec2 uv = vec2(vUv.x, 1.0 - vUv.y);
  vec3 c = read(uv) * 0.2270270270;
  c += (read(uv + uStep * 1.3846153846) + read(uv - uStep * 1.3846153846)) * 0.3162162162;
  c += (read(uv + uStep * 3.2307692308) + read(uv - uStep * 3.2307692308)) * 0.0702702703;
  outColor = vec4(c, 1.0);
}`;

const STREAK = `#version 300 es
precision highp float;
uniform sampler2D uSource;
in vec2 vUv;
out vec4 outColor;

void main() {
  vec2 uv = vec2(vUv.x, 1.0 - vUv.y);
  vec3 streak = vec3(0.0);
  float total = 0.0;
  for (int i = -12; i <= 12; i++) {
    float f = float(i) / 12.0;
    float w = exp(-abs(f) * 3.0);
    streak += texture(uSource, uv + vec2(f * 0.24, 0.0)).rgb * w;
    total += w;
  }
  float lit = dot(streak / total, vec3(0.3333)) * ${STREAK_GAIN.toFixed(1)};
  outColor = vec4(vec3(lit), 1.0);
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
  "uImageB",
  "uLevelB1",
  "uLevelB2",
  "uLevelB3",
  "uHaloB",
  "uStreak",
  "uCanvas",
  "uImageSize",
  "uImageSizeB",
  "uCut",
  "uFocus",
  "uWeave",
  "uParallax",
  "uPool",
  "uPoolTrail",
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
const EXPOSURE = 0.42;
const EXPOSURE_MAX = 1.3;
const LENS_EXPOSURE = 0.12;
const TRAIL_MAX = 0.32;
const MAX_TEXTURE = 2560;

async function decodeAside(
  src: string,
  width: number,
  height: number,
): Promise<ImageBitmap | null> {
  if (typeof createImageBitmap !== "function") return null;
  try {
    const response = await fetch(src, { mode: "cors" });
    if (!response.ok) return null;
    return await createImageBitmap(await response.blob(), {
      resizeHeight: height,
      resizeQuality: "high",
      resizeWidth: width,
    });
  } catch {
    return null;
  }
}
const DEVICE_CAP = 1.5;
const FAST = 4200;
const SETTLING_MS = 9000;

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

interface Reel {
  halo: WebGLTexture;
  levels: WebGLTexture[];
  size: [number, number];
  src: string;
  streak: WebGLTexture;
  texture: WebGLTexture;
}

interface Projector {
  show: (src: string) => void;
  stop: () => void;
}

interface Options {
  cut: number;
  defocusAt: RefObject<((y: number) => number) | undefined>;
  focus: [number, number];
  halation: number;
  onFail: () => void;
  onLive: (live: boolean) => void;
  onRestore: () => void;
  reduced: boolean;
  scrollY: ReturnType<typeof useScrollY>;
  src: string;
}

const UNPROJECTED: Projector = { show: () => {}, stop: () => {} };

const dissolve = (progress: number) => progress * progress * (3 - 2 * progress);

function project(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  {
    cut: cutRun,
    defocusAt,
    focus,
    halation,
    onFail,
    onLive,
    onRestore,
    reduced,
    scrollY,
    src,
  }: Options,
): Projector {
  const gl = canvas.getContext("webgl2", {
    alpha: false,
    antialias: false,
    depth: false,
    powerPreference: "high-performance",
    stencil: false,
  });
  if (!gl) {
    onFail();
    return UNPROJECTED;
  }
  const program = createProgram(gl, FRAGMENT);
  if (!program) {
    onFail();
    return UNPROJECTED;
  }
  gl.useProgram(program);
  const mainVao = gl.createVertexArray();
  gl.bindVertexArray(mainVao);
  bindFullscreen(gl, program);
  const u = uniforms(gl, program, NAMES);
  const samplers = [
    u.uImage,
    u.uLevel1,
    u.uLevel2,
    u.uLevel3,
    u.uHalo,
    u.uImageB,
    u.uLevelB1,
    u.uLevelB2,
    u.uLevelB3,
    u.uHaloB,
    u.uStreak,
  ];
  samplers.forEach((location, unit) => gl.uniform1i(location, unit));
  const specks = new Float32Array(12);

  let current: Reel | null = null;
  let next: Reel | null = null;
  let loading: string | null = null;
  let pending: string | null = null;
  let cut = 0;
  let cutFrom: number | null = null;
  let ready = false;
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
  let trail: [number, number] = [0, 0];
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

  const bindReel = (reel: Reel, unit: number) => {
    [reel.texture, ...reel.levels, reel.halo].forEach((target, index) => {
      gl.activeTexture(gl.TEXTURE0 + unit + index);
      gl.bindTexture(gl.TEXTURE_2D, target);
    });
  };

  const drop = (reel: Reel | null) => {
    if (!reel) return;
    [reel.texture, ...reel.levels, reel.halo, reel.streak].forEach((target) =>
      gl.deleteTexture(target),
    );
  };

  let bounds: DOMRect | null = null;
  let boundsAt = Number.NaN;
  let settling = 0;
  const measure = () => {
    if (rack <= 0.001) return;
    const y = scrollY.get();
    if (bounds && y === boundsAt && performance.now() > settling) return;
    bounds = canvas.getBoundingClientRect();
    boundsAt = y;
  };

  const draw = () => {
    if (resized) {
      fitCanvas(canvas, DEVICE_CAP);
      resized = false;
    }
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    if (!current) return;
    const incoming = next ?? current;
    bindReel(current, 0);
    bindReel(incoming, 5);
    gl.activeTexture(gl.TEXTURE10);
    gl.bindTexture(gl.TEXTURE_2D, current.streak);
    gl.uniform2f(u.uCanvas, canvas.width, canvas.height);
    gl.uniform2f(u.uImageSize, current.size[0], current.size[1]);
    gl.uniform2f(u.uImageSizeB, incoming.size[0], incoming.size[1]);
    gl.uniform1f(u.uCut, next ? dissolve(cut) : 0);
    gl.uniform2f(u.uFocus, focus[0], focus[1]);
    gl.uniform2f(u.uWeave, weave[0], weave[1]);
    gl.uniform2f(u.uParallax, parallax[0], parallax[1]);
    if (rack > 0.001) {
      const { height, left, top, width } =
        bounds ?? canvas.getBoundingClientRect();
      poolAt = [(lens.x - left) / width, (lens.y - top) / height];
      const [tx, ty] = [
        (lens.vx * LENS_EXPOSURE) / width,
        (lens.vy * LENS_EXPOSURE) / height,
      ];
      const length = Math.hypot((tx * width) / height, ty);
      const keep = length > TRAIL_MAX ? TRAIL_MAX / length : 1;
      trail = [tx * keep, ty * keep];
    }
    gl.uniform2f(u.uPool, poolAt[0], poolAt[1]);
    gl.uniform2f(u.uPoolTrail, trail[0], trail[1]);
    gl.uniform2f(u.uMotion, shutter[0], shutter[1]);
    gl.uniform1f(u.uRack, rack);
    gl.uniform1f(u.uDefocus, Math.max(0, defocus));
    gl.uniform1f(u.uVelocity, velocity);
    gl.uniform1f(u.uHalation, halation);
    gl.uniform1f(u.uFlicker, flicker);
    gl.uniform1f(u.uGrain, GRAIN);
    specks.fill(0);
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

      pull(camera, px, py, dt, CAMERA.stiffness, CAMERA.damping);
      const [ax, ay] = [
        Math.max(-1.15, Math.min(1.15, camera.x)),
        Math.max(-1.15, Math.min(1.15, camera.y)),
      ];
      const swing = Math.abs(camera.vx) + Math.abs(camera.vy);
      const nextShutter: [number, number] = [
        Math.max(-EXPOSURE_MAX, Math.min(EXPOSURE_MAX, camera.vx * EXPOSURE)),
        Math.max(-EXPOSURE_MAX, Math.min(EXPOSURE_MAX, camera.vy * EXPOSURE)),
      ];
      if (
        Math.abs(ax - parallax[0]) + Math.abs(ay - parallax[1]) > 1e-5 ||
        swing > 1e-3 ||
        shutter[0] !== 0 ||
        shutter[1] !== 0
      ) {
        parallax = [ax, ay];
        shutter =
          Math.abs(nextShutter[0]) + Math.abs(nextShutter[1]) < 0.015
            ? [0, 0]
            : nextShutter;
        dirty = true;
      }

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

    if (next) {
      cutFrom ??= timestamp;
      cut =
        cutRun > 0 ? Math.min(1, (timestamp - cutFrom) / (cutRun * 1000)) : 1;
      dirty = true;
      if (cut >= 1) {
        drop(current);
        current = next;
        next = null;
        cut = 0;
        cutFrom = null;
        queueMicrotask(drain);
      }
    }

    if (dirty) draw();
  };

  const run = () => {
    const should = ready && visible && !document.hidden;
    if (should && !running) {
      running = true;
      frame.read(measure, true);
      frame.render(step, true);
    } else if (!should && running) {
      running = false;
      bounds = null;
      cancelFrame(measure);
      cancelFrame(step);
    }
  };

  const bake = (texture: WebGLTexture, size: readonly [number, number]) => {
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
      sampleClamped(gl);
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

    const drawOut = (from: WebGLTexture): WebGLTexture | null => {
      const width = Math.min(HALO_WIDTH, size[0]);
      const height = Math.max(1, Math.round((width * size[1]) / size[0]));
      const streak = createProgram(gl, STREAK);
      if (!streak) return null;
      const target = empty(width, height);
      const strip = gl.createVertexArray();
      gl.bindVertexArray(strip);
      gl.useProgram(streak);
      bindFullscreen(gl, streak);
      gl.uniform1i(gl.getUniformLocation(streak, "uSource"), 0);
      gl.framebufferTexture2D(
        gl.FRAMEBUFFER,
        gl.COLOR_ATTACHMENT0,
        gl.TEXTURE_2D,
        target,
        0,
      );
      gl.viewport(0, 0, width, height);
      gl.bindTexture(gl.TEXTURE_2D, from);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.deleteProgram(streak);
      gl.deleteVertexArray(strip);
      return target;
    };

    const levels: WebGLTexture[] = [];
    let from = texture;
    for (const width of LEVEL_WIDTHS) {
      from = soften(from, Math.min(width, size[0]), -1);
      levels.push(from);
    }
    const halo = soften(levels[0], Math.min(HALO_WIDTH, size[0]), HALO_FROM);

    const streak = drawOut(halo);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.deleteFramebuffer(framebuffer);
    gl.bindVertexArray(mainVao);
    gl.useProgram(program);
    gl.deleteProgram(blur);
    gl.deleteVertexArray(vao);
    if (!streak) {
      for (const target of made) gl.deleteTexture(target);
      return null;
    }
    const kept = new Set([...levels, halo, streak]);
    for (const target of made) if (!kept.has(target)) gl.deleteTexture(target);
    return { halo, levels, streak };
  };

  const develop = async (image: HTMLImageElement, name: string) => {
    try {
      await image.decode();
    } catch {
      return null;
    }
    if (disposed || !image.naturalWidth) return null;
    const width = Math.min(image.naturalWidth, MAX_TEXTURE);
    const source: ImageBitmap | HTMLImageElement =
      (await decodeAside(
        image.currentSrc || image.src,
        width,
        Math.round((image.naturalHeight * width) / image.naturalWidth),
      )) ?? image;
    if (disposed || lost || gl.isContextLost()) {
      if (source instanceof ImageBitmap) source.close();
      return null;
    }
    const texture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    gl.generateMipmap(gl.TEXTURE_2D);
    sampleClamped(gl, gl.LINEAR_MIPMAP_LINEAR);
    const size: [number, number] = [source.width, source.height];
    if (source instanceof ImageBitmap) source.close();
    const baked = bake(texture, size);
    if (!baked || lost || gl.isContextLost()) {
      gl.deleteTexture(texture);
      return null;
    }
    return { ...baked, size, src: name, texture } satisfies Reel;
  };

  const upload = async () => {
    const reel = await develop(image, src);
    if (disposed) return drop(reel);
    if (!reel) return onFail();
    current = reel;
    resized = true;
    ready = true;
    settling = performance.now() + SETTLING_MS;
    defocus = reduced ? 0 : (defocusAt.current?.(scrollY.get()) ?? 0);
    draw();
    onLive(true);
    run();
    drain();
  };

  const show = (name: string) => {
    if (!current || next || loading !== null) {
      pending = name;
      return;
    }
    if (name === current.src) return;
    loading = name;
    const picture = new Image();
    picture.crossOrigin = "anonymous";
    picture.decoding = "async";
    picture.src = readable(name);
    void develop(picture, name).then((reel) => {
      loading = null;
      if (disposed) return drop(reel);
      if (!reel) return drain();
      next = reel;
      cut = 0;
      cutFrom = null;
      run();
    });
  };

  function drain() {
    const name = pending;
    pending = null;
    if (name !== null) show(name);
  }

  const sight = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    run();
  });
  sight.observe(canvas);
  const box = new ResizeObserver(() => {
    resized = true;
    bounds = null;
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

  const stop = () => {
    disposed = true;
    ready = false;
    run();
    sight.disconnect();
    box.disconnect();
    releasePointer();
    document.removeEventListener("visibilitychange", onVisibility);
    canvas.removeEventListener("webglcontextlost", onLost);
    canvas.removeEventListener("webglcontextrestored", onRestored);
    drop(current);
    drop(next);
    gl.deleteProgram(program);
    gl.deleteVertexArray(mainVao);
  };

  return { show, stop };
}

interface ProjectionProps {
  className?: string;
  cut?: number;
  defocusAt?: (scrollY: number) => number;
  halation?: number;
  mask?: CSSProperties;
  onReady?: () => void;
  position?: string;
  reel?: string | null;
  src: string;
}

export function Projection({
  className,
  cut = 1.1,
  defocusAt,
  halation = 0.55,
  mask = BACKDROP_HERO_MASK,
  onReady,
  position = "center 20%",
  reel = null,
  src,
}: ProjectionProps) {
  const theme = useTheme(primitivesTheme);
  const reduced = Boolean(useReducedMotion());
  const scrollY = useScrollY();
  const image = useRef<HTMLImageElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const focusRef = useRef(defocusAt);
  const readyRef = useRef(onReady);
  const projector = useRef<Projector | null>(null);
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
    const running = project(canvas.current, image.current, {
      cut: reduced ? 0 : cut,
      defocusAt: focusRef,
      focus: [x, y],
      halation,
      onFail: () => setPlain(true),
      onLive: setLive,
      onRestore: () => setAttempt((count) => count + 1),
      reduced,
      scrollY,
      src,
    });
    projector.current = running;
    return () => {
      running.stop();
      projector.current = null;
      setLive(false);
    };
  }, [attempt, cut, halation, plain, position, reduced, scrollY, src]);

  useEffect(() => {
    if (live) projector.current?.show(reel ?? src);
  }, [live, reel, src]);

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
          src={plain ? (reel ?? src) : readable(src)}
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
