import { PHI, size, spread } from "./tempo";

const OPEN = size(4);
// The title comes in while the picture is still developing, at the golden
// point of its reveal rather than after it.
const TITLE = size(3);

// The film grammar every page speaks: how pictures develop, how sections
// enter, how a page leaves. A page adds its own opening on top.
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
  // Below the fold everything arrives slowly and from a little further, so
  // the page pours in rather than snapping into place.
  section: {
    actions: { at: size(0), run: size(3) },
    lead: size(0),
    name: { at: 0, run: size(2) },
    patience: size(0),
    rule: { at: size(-1), run: size(3) },
    stride: size(-1),
    tail: size(-1),
    y: 26,
  },
  items: { bend: 1.35, cards: size(-1), gap: size(-2) },
  slides: {
    arrow: size(-1),
    gap: size(-2),
    glide: size(3),
    run: size(4),
    zoom: 1.18,
  },
  swap: { lead: size(-2), leave: size(0) },
  view: { enter: size(2), leave: size(0), lift: 20 },
  flow: { run: size(1) },
  scrub: {
    defocus: { range: [24, 560] },
    drift: 8,
    push: 0.12,
  },
  scroll: { response: 0.16, wheelMultiplier: 0.8 },
  // A page leaves in one movement: everything on it goes at once, and the
  // cut comes as the last of it is gone.
  exit: {
    art: 0,
    backdrop: 0,
    body: 0,
    run: size(1.5),
    wait: size(1.5),
    window: 0,
  },
  frame: {
    bars: { at: 0, height: 11, run: OPEN, shut: 50 },
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
      leave: size(0),
    },
    revisit: { pace: PHI },
  },
  undo: { cap: size(-2) },
} as const;

export interface Opening {
  end: number;
  length: number;
}

export const sinceBase = (at: number) => at - GRAMMAR.opening.base;

export const undoGap = (count: number) =>
  spread(count, GRAMMAR.exit.window, GRAMMAR.undo.cap);
