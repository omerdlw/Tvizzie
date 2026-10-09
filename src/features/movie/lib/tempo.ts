import type { Variants } from "motion/react";

export const PHI = (1 + Math.sqrt(5)) / 2;
const BEAT = 0.42;

export const size = (n: number) => BEAT * PHI ** n;
export const hand = (n: number) => size(n - 2);

export const LANDED = 0.6;
export const landed = (n: number) => size(n) * LANDED;

export const spread = (count: number, window: number, cap = Infinity) =>
  count <= 1 ? 0 : Math.min(cap, window / (count - 1));

export const settle = (i: number, n: number, total: number, bend = 1.7) =>
  n <= 1 ? 0 : total * (1 - (1 - i / (n - 1)) ** bend);

type Bezier = [number, number, number, number];

export const EASE = {
  expo: [0.16, 1, 0.3, 1] as Bezier,
  glide: [0.65, 0, 0.35, 1] as Bezier,
  silk: [0.22, 1, 0.36, 1] as Bezier,
};

export const blur = (px: number) => `blur(${px}px)`;

export const focus = (px: number) => (px > 0.05 ? blur(px) : "none");

export const FOCUSED = { filter: "none" } as const;

export const DIM = 0.4;

export const exposure = (level: number) =>
  level >= 0.999 ? "none" : `brightness(${level})`;

export const wordCount = (text: string) =>
  text.split(/\s+/).filter(Boolean).length;

const arrived = (n: number) => ({
  filter: "brightness(1)",
  opacity: 1,
  transition: { duration: size(n), ease: EASE.expo },
  transitionEnd: FOCUSED,
});

export type ItemKind = "left" | "right" | "scale" | "up";

const RUNS: Record<ItemKind, number> = {
  left: 2,
  right: 2,
  scale: 2,
  up: 3,
};

export const ITEMS: Record<ItemKind, Variants> = {
  left: {
    hidden: { filter: exposure(DIM), opacity: 0, x: -16 },
    visible: { ...arrived(RUNS.left), x: 0 },
  },
  right: {
    hidden: { filter: exposure(DIM), opacity: 0, x: 16 },
    visible: { ...arrived(RUNS.right), x: 0 },
  },
  scale: {
    hidden: { filter: exposure(DIM), opacity: 0, scale: 0.9, y: 14 },
    visible: { ...arrived(RUNS.scale), scale: 1, y: 0 },
  },
  up: {
    hidden: { filter: exposure(DIM), opacity: 0, scale: 0.97, y: 36 },
    visible: { ...arrived(RUNS.up), scale: 1, y: 0 },
  },
};
