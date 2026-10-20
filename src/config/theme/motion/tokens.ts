import { defineMotion } from "@omerdlw/base-framework/tokens";
import { EASE, size } from "@/motion/stage/tempo";

// The framework's modules (dock, modals, toasts, context menu) ship no motion
// of their own: they play what the theme files in this folder give them. They
// speak the pages' film grammar (src/motion/stage): time is measured in golden
// steps of the same beat, things move on the same curves, and the same rules
// hold. Chrome never travels: controls, headers and actions come up and go
// down where they stand, on light. A change is one movement: what leaves goes
// first and quickly, the card moves once, straight to its new size, and what
// arrives comes into light as it settles. Nothing squeezes or bounces.
//
// tempo stretches everything a module animates (durations, delays, staggers,
// choreography timers, springs). Values here are written at tempo 1.
export const motion = defineMotion({
  tempo: 1,
  reducedMotion: "user",
  durations: {
    // A step in a row of things lighting one after another.
    step: size(-5),
    // A hand's touch answered; the first thing to leave.
    touch: size(-3),
    // Light going down: what leaves, leaves quickly.
    leave: size(-2),
    // Light coming up on chrome.
    light: size(-1),
    // Content coming into light, and a swap of it.
    reveal: size(0),
    // The card moving: resizing, the deck shifting, the house lights.
    move: size(1),
  },
  easings: {
    // How things arrive and how the card moves: out of rest without a kick,
    // half-way at a quarter of the run, a long settle.
    pour: EASE.pour,
    // Light coming up or going down: no step at either end.
    fade: EASE.fade,
    // A camera move between two points.
    dolly: EASE.dolly,
    // A move between two resting points.
    glide: EASE.glide,
  },
  springs: {
    // Critically damped: a press gives and comes back without a wobble.
    press: { type: "spring", stiffness: 640, damping: 30, mass: 0.32 },
    // The scrubber's tooltip trailing the pointer, without overshoot.
    follow: { stiffness: 360, damping: 38 },
  },
});

type Ease = readonly [number, number, number, number];

export const tween = (duration: number, ease: Ease, delay = 0) =>
  ({
    type: "tween",
    duration,
    ease,
    ...(delay > 0 ? { delay } : {}),
  }) as const;
