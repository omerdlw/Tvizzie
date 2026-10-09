"use client";

import { useEffect, useRef } from "react";
import { cancelFrame, frame, type MotionValue } from "motion/react";
import { houseIsDown } from "./house";

const MOTES = 280;
const BOKEH = 0.035;
const REACH = 0.8;
const SETTLE = 2;
const DRAG = 1.1;
const SWIRL = 0.35;
const STREAK = 0.014;
const SPRITE = 64;

interface Mote {
  bokeh: boolean;
  phase: number;
  size: number;
  spin: number;
  vx: number;
  vy: number;
  x: number;
  y: number;
  z: number;
}

function sprite() {
  const canvas = document.createElement("canvas");
  canvas.width = SPRITE;
  canvas.height = SPRITE;
  const context = canvas.getContext("2d");
  if (!context) return null;
  const half = SPRITE / 2;
  const gradient = context.createRadialGradient(
    half,
    half,
    0,
    half,
    half,
    half,
  );
  gradient.addColorStop(0, "rgb(255 248 236 / 0.55)");
  gradient.addColorStop(0.78, "rgb(255 248 236 / 0.7)");
  gradient.addColorStop(0.9, "rgb(255 248 236 / 0.9)");
  gradient.addColorStop(1, "rgb(255 248 236 / 0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, SPRITE, SPRITE);
  return canvas;
}

function air(x: number, y: number, t: number, z: number): [number, number] {
  const angle =
    Math.PI *
    (Math.sin(x * 0.0031 + t * 0.13) +
      Math.sin(y * 0.0042 - t * 0.09 + 1.7) +
      Math.sin((x + y) * 0.0021 + t * 0.07));
  const speed = 5 + 16 * z;
  return [Math.cos(angle) * speed, Math.sin(angle) * speed - 4 * z];
}

export function Dust({
  opacity,
  radius,
  x,
  y,
}: {
  opacity: MotionValue<number>;
  radius: number;
  x: MotionValue<number>;
  y: MotionValue<number>;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const element = canvas.current;
    const context = element?.getContext("2d");
    const dot = sprite();
    if (!element || !context || !dot) return;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const box = radius * 2;
    element.width = box * ratio;
    element.height = box * ratio;
    context.scale(ratio, ratio);

    const motes: Mote[] = Array.from({ length: MOTES }, () => {
      const bokeh = Math.random() < BOKEH;
      const z = bokeh ? 1 : 0.35 + Math.random() * 0.65;
      return {
        bokeh,
        phase: Math.random() * Math.PI * 2,
        size: bokeh
          ? 5 + Math.random() * 7
          : 0.35 + z * 0.75 + Math.random() * 0.4,
        spin: 0.7 + Math.random() * 2.4,
        vx: 0,
        vy: 0,
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        z,
      };
    });

    let last = 0;
    let cleared = true;
    let calm = 1;
    const step = ({ timestamp }: { timestamp: number }) => {
      const dt = last === 0 ? 0 : Math.min(0.05, (timestamp - last) / 1000);
      last = timestamp;
      const scrolling = document.documentElement.hasAttribute("data-scrolling");
      calm += ((scrolling ? 0 : 1) - calm) * (1 - Math.exp(-dt * 7));
      const lit = (houseIsDown() ? 0 : opacity.get()) * calm;
      if (lit < 0.02) {
        if (!cleared) context.clearRect(0, 0, box, box);
        cleared = true;
        return;
      }
      cleared = false;

      const width = window.innerWidth;
      const height = window.innerHeight;
      const left = x.get();
      const top = y.get();
      const cx = left + radius;
      const cy = top + radius;
      const rush = Math.hypot(x.getVelocity(), y.getVelocity());
      const gain = rush > 700 ? 700 / rush : 1;
      const lx = x.getVelocity() * gain;
      const ly = y.getVelocity() * gain;
      const stir = Math.hypot(lx, ly);
      const reach = radius * REACH;
      const seconds = timestamp / 1000;
      const settle = 1 - Math.exp(-dt * SETTLE);
      const pull = 1 - Math.exp(-dt * 5);

      context.clearRect(0, 0, box, box);
      context.fillStyle = "rgb(255 250 240)";
      for (const mote of motes) {
        const [ax, ay] = air(mote.x, mote.y, seconds, mote.z);
        mote.vx += (ax - mote.vx) * settle;
        mote.vy += (ay - mote.vy) * settle;

        const dx = mote.x - cx;
        const dy = mote.y - cy;
        const near = Math.hypot(dx, dy);
        if (stir > 8 && near < reach) {
          const falloff = (1 - near / reach) ** 2;
          const carry = DRAG * falloff * mote.z * pull;
          mote.vx += (lx - mote.vx) * carry;
          mote.vy += (ly - mote.vy) * carry;
          const turn = (stir * SWIRL * falloff * mote.z * pull) / (near + 40);
          mote.vx += -dy * turn;
          mote.vy += dx * turn;
        }

        mote.x += mote.vx * dt;
        mote.y += mote.vy * dt;
        mote.phase += dt * mote.spin * (mote.bokeh ? 0.25 : 1);
        if (mote.x < -10) mote.x += width + 20;
        if (mote.x > width + 10) mote.x -= width + 20;
        if (mote.y < -10) mote.y += height + 20;
        if (mote.y > height + 10) mote.y -= height + 20;

        const distance = Math.hypot(mote.x - cx, mote.y - cy) / radius;
        if (distance >= 1) continue;
        const beam = (1 - distance) ** 2;
        const px = mote.x - left;
        const py = mote.y - top;

        if (mote.bokeh) {
          const breath = 0.8 + 0.2 * Math.sin(mote.phase);
          context.globalAlpha = Math.min(1, beam * 0.07 * breath * lit);
          const r = mote.size;
          context.drawImage(dot, px - r, py - r, r * 2, r * 2);
          continue;
        }

        const glint = Math.max(0, Math.sin(mote.phase)) ** 8;
        const alpha = beam * (0.12 + 0.88 * glint) * (0.4 + 0.6 * mote.z) * lit;
        if (alpha < 0.012) continue;
        context.globalAlpha = Math.min(1, alpha * 0.9);
        const speed = Math.hypot(mote.vx, mote.vy);
        const length = Math.min(3, speed * STREAK);
        context.beginPath();
        if (length > 0.35) {
          context.ellipse(
            px,
            py,
            mote.size + length,
            mote.size,
            Math.atan2(mote.vy, mote.vx),
            0,
            Math.PI * 2,
          );
        } else {
          context.arc(px, py, mote.size, 0, Math.PI * 2);
        }
        context.fill();
      }
      context.globalAlpha = 1;
    };
    frame.render(step, true);
    return () => cancelFrame(step);
  }, [opacity, radius, x, y]);

  return (
    <canvas
      aria-hidden="true"
      className="absolute inset-0 size-full"
      ref={canvas}
    />
  );
}
