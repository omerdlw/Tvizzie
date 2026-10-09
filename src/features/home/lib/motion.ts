import { beat, span, type Score } from "@/motion/cinema/score";

export const SCENE = {
  backdrop: {
    blur: 16,
    brightness: 0.35,
    delay: beat(2),
    fade: span(3),
    push: span(5),
    scaleFrom: 1.5,
    scaleTo: 1,
  },
  title: { delay: beat(3), duration: span(2), span: span(1), stagger: 0.14 },
  rule: { delay: beat(4), duration: span(2) },
  poster: {
    delay: beat(4),
    duration: span(3),
    shine: beat(4) + span(3) * 0.62,
    zoom: span(3) + beat(1),
  },
  scroll: { duration: span(2), offset: 56, stagger: beat(1) / 4.5 },
  exit: {
    backdrop: { delay: beat(1.25), duration: span(1) * 0.7 },
    body: { delay: beat(1), duration: span(1) * 0.7 },
    poster: { delay: beat(0.5), duration: span(1) * 0.8 },
    rule: { duration: span(0) },
    title: { duration: span(0), stagger: 0.07 },
    wait: beat(3.1),
  },
  swap: { enter: span(1), exit: 0.45, delay: 0.12 },
} as const satisfies Score & Record<string, unknown>;

export const REEL_INTRO = {
  rows: beat(3),
} as const;
