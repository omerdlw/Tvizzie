import type { Variants } from "motion/react";

export const PHI = (1 + Math.sqrt(5)) / 2;
const BEAT = 0.5;

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
  cream: [0.3, 0.85, 0.3, 1] as Bezier,
  dolly: [0.45, 0, 0.15, 1] as Bezier,
  expo: [0.16, 1, 0.3, 1] as Bezier,
  fade: [0.4, 0, 0.2, 1] as Bezier,
  glide: [0.65, 0, 0.35, 1] as Bezier,
  pour: [0.33, 0.35, 0.15, 1] as Bezier,
  silk: [0.22, 1, 0.36, 1] as Bezier,
};

export const blur = (px: number) => `blur(${px}px)`;

export const focus = (px: number) => (px > 0.05 ? blur(px) : "none");

export const FOCUSED = { filter: "none" } as const;

export const wordCount = (text: string) =>
  text.split(/\s+/).filter(Boolean).length;

export const ARRIVE = { light: size(2), run: size(3) } as const;

type Target = Record<string, number>;

const arriving =
  (to: Target, run: number = ARRIVE.run, light: number = ARRIVE.light) =>
  (delay: number = 0) => ({
    ...to,
    opacity: 1,
    transition: {
      delay,
      duration: run,
      ease: EASE.pour,
      opacity: { delay, duration: light, ease: EASE.fade },
    },
  });

export type ItemKind =
  "dot" | "grow" | "left" | "right" | "light" | "scale" | "still" | "up";

function itemVariants(pace: number): Record<ItemKind, Variants> {
  const run = ARRIVE.run / pace;
  const light = ARRIVE.light / pace;
  const travel = (px: number) => px / pace;
  return {
    dot: {
      hidden: { opacity: 0, scale: 0 },
      visible: arriving({ scale: 1 }, size(2) / pace, size(1) / pace),
    },
    grow: {
      hidden: { opacity: 0, scaleY: 0 },
      visible: arriving({ scaleY: 1 }, run, light),
    },
    left: {
      hidden: { opacity: 0, x: travel(-20) },
      visible: arriving({ x: 0 }, run, light),
    },
    light: {
      hidden: { opacity: 0 },
      visible: arriving({}, run, light),
    },
    right: {
      hidden: { opacity: 0, x: travel(20) },
      visible: arriving({ x: 0 }, run, light),
    },
    scale: {
      hidden: { opacity: 0, scale: 1 - 0.06 / pace, y: travel(10) },
      visible: arriving({ scale: 1, y: 0 }, run, light),
    },
    still: { hidden: {}, visible: {} },
    up: {
      hidden: { opacity: 0, y: travel(24) },
      visible: arriving({ y: 0 }, run, light),
    },
  };
}

const ITEMS = itemVariants(1);

const PACED = new Map<number, Record<ItemKind, Variants>>([[1, ITEMS]]);

export function itemsAt(pace: number): Record<ItemKind, Variants> {
  let items = PACED.get(pace);
  if (!items) {
    items = itemVariants(pace);
    PACED.set(pace, items);
  }
  return items;
}
