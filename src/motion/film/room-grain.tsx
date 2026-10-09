"use client";

import { useEffect, useRef } from "react";
import { bindFullscreen, createProgram, uniforms } from "./gl";

const FRAGMENT = `#version 300 es
precision highp float;
uniform float uAmount;
out vec4 outColor;

float hash(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * 0.1031);
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}

void main() {
  vec2 cell = floor(gl_FragCoord.xy);
  float n = hash(cell) * 0.7 + hash(floor(cell / 2.0) + 17.0) * 0.3 - 0.5;
  float a = abs(n) * 2.0 * uAmount;
  outColor = vec4((n > 0.0 ? vec3(1.0) : vec3(0.0)) * a, a);
}`;

const AMOUNT = 0.06;

const REGION =
  "h-[calc(20rem+8rem)] sm:h-[calc(24rem+10rem)] lg:h-[calc(clamp(36rem,52vw,44rem)+16rem)] xl:h-[calc(clamp(40rem,56vw,48rem)+18rem)]";
const THIN = "var(--grain-thin)";
const THIN_SIZES =
  "[--grain-thin:8rem] sm:[--grain-thin:10rem] lg:[--grain-thin:16rem] xl:[--grain-thin:18rem]";
const MASK = `linear-gradient(to bottom, #000 calc(100% - ${THIN}), rgb(0 0 0 / 0.62) calc(100% - ${THIN} * 0.7), rgb(0 0 0 / 0.26) calc(100% - ${THIN} * 0.4), rgb(0 0 0 / 0.07) calc(100% - ${THIN} * 0.15), transparent)`;

export function RoomGrain() {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const element = canvas.current;
    const gl = element?.getContext("webgl2", {
      antialias: false,
      depth: false,
      premultipliedAlpha: true,
      stencil: false,
    });
    if (!element || !gl) return;
    const program = createProgram(gl, FRAGMENT);
    if (!program) return;
    gl.useProgram(program);
    bindFullscreen(gl, program);
    const u = uniforms(gl, program, ["uAmount"] as const);

    const draw = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      element.width = Math.max(1, Math.round(element.clientWidth * ratio));
      element.height = Math.max(1, Math.round(element.clientHeight * ratio));
      gl.viewport(0, 0, element.width, element.height);
      gl.uniform1f(u.uAmount, AMOUNT);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(element);
    return () => {
      observer.disconnect();
      gl.deleteProgram(program);
    };
  }, []);

  return (
    <canvas
      aria-hidden="true"
      className={`pointer-events-none absolute inset-x-0 top-0 z-0 w-full ${REGION} ${THIN_SIZES}`}
      ref={canvas}
      style={{ maskImage: MASK, WebkitMaskImage: MASK }}
    />
  );
}
