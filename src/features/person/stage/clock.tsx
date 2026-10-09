"use client";

import { createContext, useContext, type ReactNode } from "react";
import {
  cubicBezier,
  motion,
  useMotionValue,
  useTransform,
  type MotionValue,
} from "motion/react";
import { SCENE, sinceBase } from "../lib/motion";
import { DIM, EASE, exposure, size } from "../lib/tempo";

export const ClockContext = createContext<MotionValue<number> | null>(null);
export const ExitContext = createContext<MotionValue<number> | null>(null);

export const HeadContext = createContext(0);

export const skipped = (at: number, run: number, head: number) => ({
  delay: Math.max(0, at - head),
  duration: Math.max(run - Math.max(0, head - at), 0),
});

const curve = (bezier: readonly number[]) =>
  cubicBezier(bezier[0], bezier[1], bezier[2], bezier[3]);

export const ease = {
  expo: curve(EASE.expo),
  glide: curve(EASE.glide),
  linear: (progress: number) => progress,
  silk: curve(EASE.silk),
};

export const unit = (value: number) => Math.min(1, Math.max(0, value));

const PAST = 1e6;

function useClock() {
  const clock = useContext(ClockContext);
  const past = useMotionValue(PAST);
  return clock ?? past;
}

function useExitClock() {
  const out = useContext(ExitContext);
  const idle = useMotionValue(-1);
  return out ?? idle;
}

export function useProgress(
  at: number,
  run: number,
  shape: (progress: number) => number = ease.expo,
) {
  const clock = useClock();
  return useTransform(clock, (time) => shape(unit((time - at) / run)));
}

export function useExit(at: number, run: number = SCENE.exit.run) {
  const out = useExitClock();
  return useTransform(out, (time) => ease.glide(unit((time - at) / run)));
}

export function Fade({
  as = "div",
  at,
  children,
  className,
  out,
  run = size(-1),
}: {
  as?: "dd" | "div" | "span";
  at: number;
  children: ReactNode;
  className?: string;
  out?: number;
  run?: number;
}) {
  const entered = useProgress(sinceBase(at), run);
  const left = useExit(out ?? PAST);
  const opacity = useTransform(
    [entered, left],
    ([a, b]: number[]) => a * (1 - b),
  );
  const Tag = motion[as] as typeof motion.div;
  return (
    <Tag className={className} style={{ opacity }}>
      {children}
    </Tag>
  );
}

const FROM = {
  left: { run: 2, scale: 1, x: -16, y: 0 },
  right: { run: 2, scale: 1, x: 16, y: 0 },
  scale: { run: 2, scale: 0.9, x: 0, y: 14 },
  up: { run: 3, scale: 0.97, x: 0, y: 36 },
} as const;

export function Rise({
  at,
  children,
  className,
  from = "up",
}: {
  at: number;
  children: ReactNode;
  className?: string;
  from?: keyof typeof FROM;
}) {
  const kind = FROM[from];
  const progress = useProgress(sinceBase(at), size(kind.run));
  const x = useTransform(progress, (p) => (1 - p) * kind.x);
  const y = useTransform(progress, (p) => (1 - p) * kind.y);
  const scale = useTransform(progress, (p) => 1 - (1 - p) * (1 - kind.scale));
  const filter = useTransform(progress, (p) => exposure(DIM + (1 - DIM) * p));
  return (
    <motion.div
      className={className}
      style={{ filter, opacity: progress, scale, x, y }}
    >
      {children}
    </motion.div>
  );
}
