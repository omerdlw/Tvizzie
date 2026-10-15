import type { Variants } from "motion/react";

export const PHI = (1 + Math.sqrt(5)) / 2;
// The film pages' unit of time. Everything on them is measured in golden steps
// of it, so lengthening the beat slows the whole page in proportion.
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

// Curves are chosen by when the eye can follow them. An expo out covers half
// its way in the first tenth of its run and reads as a cut; the curves things
// arrive on cover half by the first quarter, so a run is seen as long as it is.
export const EASE = {
  // Arrivals below the fold: leaves gently instead of with a jolt, and takes
  // the long, soft way to rest.
  cream: [0.3, 0.85, 0.3, 1] as Bezier,
  // A camera move between two points: eases out of rest and settles slowly.
  // Sweeps across a header ride it, so the light starts and stops like a pan.
  dolly: [0.45, 0, 0.15, 1] as Bezier,
  expo: [0.16, 1, 0.3, 1] as Bezier,
  // Light coming up: no step at the start, half-lit about where a pour is
  // half-way, so a thing is never seen moving while still unseen.
  fade: [0.4, 0, 0.2, 1] as Bezier,
  glide: [0.65, 0, 0.35, 1] as Bezier,
  // How things arrive: out of rest without a kick, half-way at a quarter of
  // the run, and a long settle that is still visibly moving.
  pour: [0.33, 0.35, 0.15, 1] as Bezier,
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

// An arrival moves for a long step and comes into light over the step before
// it, so it is fully lit a little before it comes to rest.
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

// Content travels, and only a little: far enough to be seen settling, never
// so far it reads as flying in. The chrome around it never travels at all.
export const ITEMS: Record<ItemKind, Variants> = {
  dot: {
    hidden: { opacity: 0, scale: 0 },
    visible: arriving({ scale: 1 }, size(2), size(1)),
  },
  grow: {
    hidden: { opacity: 0, scaleY: 0 },
    visible: arriving({ scaleY: 1 }),
  },
  left: {
    hidden: { opacity: 0, x: -20 },
    visible: arriving({ x: 0 }),
  },
  // Comes up where it stands, on light alone. Nothing under it moves, so its
  // words and pictures are drawn once, on whole pixels, and never redrawn
  // as they slide: the arrival runs on the compositor and cannot shimmer.
  light: {
    hidden: { opacity: 0 },
    visible: arriving({}),
  },
  right: {
    hidden: { opacity: 0, x: 20 },
    visible: arriving({ x: 0 }),
  },
  scale: {
    hidden: { opacity: 0, scale: 0.94, y: 10 },
    visible: arriving({ scale: 1, y: 0 }),
  },
  // Arrives in place: whatever is inside reveals itself on the item's clock.
  still: { hidden: {}, visible: {} },
  up: {
    hidden: { opacity: 0, y: 24 },
    visible: arriving({ y: 0 }),
  },
};
