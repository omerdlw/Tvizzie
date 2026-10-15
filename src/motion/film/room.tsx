"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { cancelFrame, frame, useReducedMotion } from "motion/react";
import {
  BURN,
  bindFullscreen,
  createProgram,
  readable,
  thumbnail,
  uniforms,
} from "./gl";

// The light the picture throws on the room: far out of focus, a fraction of
// the canvas's pixels, and cut from reel to reel the way the projector is.
const FRAGMENT = `#version 300 es
precision highp float;
uniform sampler2D uA;
uniform sampler2D uB;
uniform vec2 uCanvas;
uniform vec2 uSizeA;
uniform vec2 uSizeB;
uniform float uCut;
uniform float uSeed;
uniform vec2 uFrom;
in vec2 vUv;
out vec4 outColor;

${BURN}

vec2 cover(vec2 uv, vec2 size) {
  float canvasAspect = uCanvas.x / uCanvas.y;
  float imageAspect = size.x / size.y;
  vec2 visible = canvasAspect > imageAspect
    ? vec2(1.0, imageAspect / canvasAspect)
    : vec2(canvasAspect / imageAspect, 1.0);
  visible /= 1.16;
  return 0.5 * (1.0 - visible) + uv * visible;
}

vec3 soft(sampler2D source, vec2 st) {
  vec3 color = textureLod(source, st, 3.0).rgb * 0.2;
  for (int i = 0; i < 8; i++) {
    float a = float(i) * 0.7853982;
    color += textureLod(source, st + vec2(cos(a), sin(a)) * 0.05, 3.5).rgb * 0.1;
  }
  return color;
}

void main() {
  float aspect = uCanvas.x / uCanvas.y;
  vec3 color = soft(uA, cover(vUv, uSizeA));
  if (uCut > 0.0) {
    vec2 burnt = burn(burnField(vUv, aspect, uFrom, uSeed), uCut);
    color = mix(color, soft(uB, cover(vUv, uSizeB)), burnt.x);
    color = burnLight(color, uCut, burnt);
  }
  float grey = dot(color, vec3(0.299, 0.587, 0.114));
  color = mix(vec3(grey), color, 1.05) * 0.5;
  outColor = vec4(color, 1.0);
}`;

const SCALE = 0.25;

interface Slide {
  size: [number, number];
  src: string;
  texture: WebGLTexture;
}

export function Room({
  className,
  cut = 1.1,
  from = [0.5, 0.5],
  src,
  style,
}: {
  className?: string;
  cut?: number;
  from?: [number, number];
  src: string | null;
  style?: CSSProperties;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();
  const show = useRef<((src: string) => void) | null>(null);
  const run = useRef(cut);
  const origin = useRef(from);

  useEffect(() => {
    run.current = reduced ? 0 : cut;
    origin.current = from;
  });

  useEffect(() => {
    const element = canvas.current;
    const gl = element?.getContext("webgl2", {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
    });
    if (!element || !gl) return;
    const program = createProgram(gl, FRAGMENT);
    if (!program) return;
    gl.useProgram(program);
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    bindFullscreen(gl, program);
    const u = uniforms(gl, program, [
      "uA",
      "uB",
      "uCanvas",
      "uSizeA",
      "uSizeB",
      "uCut",
      "uSeed",
      "uFrom",
    ] as const);

    let current: Slide | null = null;
    let next: Slide | null = null;
    let wanted: string | null = null;
    let progress = 0;
    let started: number | null = null;
    let seed = 0;
    let looping = false;
    let gone = false;

    const fit = () => {
      const width = Math.max(1, Math.round(element.clientWidth * SCALE));
      const height = Math.max(1, Math.round(element.clientHeight * SCALE));
      if (element.width === width && element.height === height) return;
      element.width = width;
      element.height = height;
    };

    const draw = () => {
      if (!current || gl.isContextLost()) return;
      fit();
      gl.viewport(0, 0, element.width, element.height);
      const incoming = next ?? current;
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, current.texture);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, incoming.texture);
      gl.uniform1i(u.uA, 0);
      gl.uniform1i(u.uB, 1);
      gl.uniform2f(u.uCanvas, element.width, element.height);
      gl.uniform2f(u.uSizeA, current.size[0], current.size[1]);
      gl.uniform2f(u.uSizeB, incoming.size[0], incoming.size[1]);
      gl.uniform1f(u.uCut, next ? progress : 0);
      gl.uniform1f(u.uSeed, seed);
      gl.uniform2f(u.uFrom, origin.current[0], origin.current[1]);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const step = ({ timestamp }: { timestamp: number }) => {
      if (!next) return;
      started ??= timestamp;
      progress =
        run.current > 0
          ? Math.min(1, (timestamp - started) / (run.current * 1000))
          : 1;
      if (progress >= 1) {
        if (current) gl.deleteTexture(current.texture);
        current = next;
        next = null;
        progress = 0;
        started = null;
        looping = false;
        cancelFrame(step);
        draw();
        if (wanted && wanted !== current.src) load(wanted);
        return;
      }
      draw();
    };

    const load = (name: string) => {
      const picture = new Image();
      picture.crossOrigin = "anonymous";
      picture.decoding = "async";
      picture.src = readable(thumbnail(name));
      void picture
        .decode()
        .then(() => {
          if (gone || gl.isContextLost() || wanted !== name || next) return;
          const texture = gl.createTexture();
          gl.activeTexture(gl.TEXTURE0);
          gl.bindTexture(gl.TEXTURE_2D, texture);
          gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            picture,
          );
          gl.generateMipmap(gl.TEXTURE_2D);
          gl.texParameteri(
            gl.TEXTURE_2D,
            gl.TEXTURE_MIN_FILTER,
            gl.LINEAR_MIPMAP_LINEAR,
          );
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
          const slide: Slide = {
            size: [picture.naturalWidth, picture.naturalHeight],
            src: name,
            texture,
          };
          if (!current) {
            current = slide;
            draw();
            return;
          }
          next = slide;
          seed = Math.random() * 100;
          if (!looping) {
            looping = true;
            frame.render(step, true);
          }
        })
        .catch(() => {});
    };

    show.current = (name: string) => {
      wanted = name;
      if (next || current?.src === name) return;
      load(name);
    };

    const box = new ResizeObserver(draw);
    box.observe(element);

    return () => {
      gone = true;
      show.current = null;
      box.disconnect();
      cancelFrame(step);
      if (current) gl.deleteTexture(current.texture);
      if (next) gl.deleteTexture(next.texture);
      gl.deleteProgram(program);
      gl.deleteVertexArray(vao);
    };
  }, []);

  useEffect(() => {
    if (src) show.current?.(src);
  }, [src]);

  return (
    <canvas
      aria-hidden="true"
      className={className}
      ref={canvas}
      style={style}
    />
  );
}
