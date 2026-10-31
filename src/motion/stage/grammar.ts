import { PHI, size, spread } from "./tempo";

const OPEN = size(4);
const TITLE = size(3);

export const GRAMMAR = {
  backdrop: {
    at: 0,
    blur: 18,
    brightness: 0.25,
    run: OPEN,
    scaleFrom: 1.45,
  },
  title: { at: TITLE, run: size(3), window: size(1) },
  facts: { expose: size(1), gap: size(-1), lag: size(-1), replay: size(1) },
  count: { replay: size(2), run: size(3) },
  opening: { base: TITLE },
  section: {
    lead: size(1),
    patience: size(0),
    span: size(1),
    stride: size(-1),
    sweep: { feather: 96, run: size(3) },
  },
  items: { bend: 1.35, cards: size(-1), gap: size(-2), wait: size(0) },
  slides: {
    arrow: size(-1),
    gap: size(-2),
    glide: size(3),
    run: size(3),
    zoom: 1.14,
  },
  swap: { lead: 0, leave: size(-1) },
  view: { enter: size(2), leave: size(0), lift: 20 },
  flow: { run: size(1) },
  scrub: {
    defocus: { range: [24, 560] },
    drift: 8,
    push: 0.12,
  },
  scroll: { response: 0.16, wheelMultiplier: 0.8 },
  exit: {
    art: 0,
    backdrop: 0,
    body: 0,
    run: size(1.5),
    wait: size(1.5),
    window: 0,
  },
  frame: {
    light: size(4),
  },
  film: {
    arrive: { pace: Math.sqrt(PHI) },
    carry: { reveal: size(2), run: size(2) },
    cut: size(2),
    halation: 0.55,
    house: { level: 0.8, run: size(3) },
    intermission: {
      after: size(11),
      drift: size(9),
      enter: size(4),
      leave: size(2),
    },
    revisit: { pace: PHI },
  },
  undo: { cap: size(-2) },
  wall: {
    back: size(2),
    dim: size(1),
    down: size(0),
    gap: size(-4),
    roll: { max: size(3), min: size(1), per: 2600 },
  },
} as const;

export interface Opening {
  end: number;
  length: number;
}

export const sinceBase = (at: number) => at - GRAMMAR.opening.base;

export const undoGap = (count: number) =>
  spread(count, GRAMMAR.exit.window, GRAMMAR.undo.cap);
