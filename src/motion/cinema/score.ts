import type { Variants } from "motion/react";

type Bezier = [number, number, number, number];

export const EASE = {
  expo: [0.16, 1, 0.3, 1] as Bezier,
  glide: [0.65, 0, 0.35, 1] as Bezier,
  silk: [0.22, 1, 0.36, 1] as Bezier,
  soft: [0.33, 1, 0.68, 1] as Bezier,
};

const PHI = 1.618033988749895;
const BEAT = 1 / (PHI * PHI);
export const beat = (n: number) => +(n * BEAT).toFixed(3);
export const span = (n: number) => +(0.618 * PHI ** n).toFixed(3);

export const blur = (px: number) => `blur(${px}px)`;

const LANDED = 0.6;
export const landed = (duration: number) => +(duration * LANDED).toFixed(3);

export const settle = (i: number, n: number, total: number) =>
  n <= 1 ? 0 : total * (1 - (1 - i / (n - 1)) ** 1.7);

export const sequence = (i: number, n: number, total: number) =>
  n <= 1 ? 0 : (total * i) / (n - 1);

export interface Score {
  backdrop: {
    blur: number;
    brightness: number;
    delay: number;
    fade: number;
    push: number;
    scaleFrom: number;
    scaleTo: number;
  };
  exit: {
    backdrop: { delay: number; duration: number };
    body: { delay: number; duration: number };
    poster: { delay: number; duration: number };
    rule: { duration: number };
    title: { duration: number; stagger: number };
    wait: number;
  };
  poster: {
    delay: number;
    duration: number;
    shine: number;
    zoom: number;
  };
  rule: {
    delay: number;
    duration: number;
    origin?: "center" | "left";
  };
  scroll: { duration: number; offset: number; stagger: number };
  swap: { delay: number; enter: number; exit: number };
  title: { delay: number; duration: number; span: number; stagger: number };
}

type ItemKind = "left" | "right" | "scale" | "up";

export const cascadeGroup = (
  score: Pick<Score, "swap">,
  stagger: number,
): Variants => ({
  exit: {
    filter: blur(8),
    opacity: 0,
    transition: { duration: score.swap.exit, ease: EASE.glide },
    y: -14,
  },
  hidden: {},
  visible: (lead: number = 0) => ({
    transition: { delayChildren: lead, staggerChildren: stagger },
  }),
});

const arrive = (duration: number) => ({
  filter: blur(0),
  opacity: 1,
  transition: { duration, ease: EASE.expo },
});

export const cascadeItems = (
  score: Pick<Score, "scroll">,
): Record<ItemKind, Variants> => ({
  left: {
    hidden: { filter: blur(8), opacity: 0, x: -36 },
    visible: { ...arrive(span(1.5)), x: 0 },
  },
  right: {
    hidden: { filter: blur(8), opacity: 0, x: 48 },
    visible: { ...arrive(span(1.5)), x: 0 },
  },
  scale: {
    hidden: { filter: blur(10), opacity: 0, scale: 0.86 },
    visible: { ...arrive(span(1.5)), scale: 1 },
  },
  up: {
    hidden: { filter: blur(10), opacity: 0, y: 34 },
    visible: { ...arrive(score.scroll.duration), y: 0 },
  },
});
