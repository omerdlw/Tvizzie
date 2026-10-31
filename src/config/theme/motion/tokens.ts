import { defineMotion } from "@omerdlw/base-framework/tokens";
import { EASE, size } from "@/motion/stage/tempo";

export const motion = defineMotion({
  tempo: 1,
  reducedMotion: "user",
  durations: {
    step: size(-5),
    touch: size(-3),
    leave: size(-2),
    light: size(-1),
    reveal: size(0),
    move: size(1),
  },
  easings: {
    pour: EASE.pour,
    fade: EASE.fade,
    dolly: EASE.dolly,
    glide: EASE.glide,
  },
  springs: {
    press: { type: "spring", stiffness: 640, damping: 30, mass: 0.32 },
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
