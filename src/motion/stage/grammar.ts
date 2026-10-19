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
  // Below the fold a section is opened like a shot. One light crosses its
  // header from left to right and reveals each part where it passes: the icon
  // comes up, the name is exposed, the rule is drawn under the light and the
  // controls are wiped in as it reaches them. Nothing in a header travels.
  // The content starts once the light is 1/φ² of the way through, and the
  // next section may open at that same moment, so a page scrolled through
  // quickly is never left waiting on a sweep.
  section: {
    lead: size(1),
    patience: size(0),
    span: size(1),
    stride: size(-1),
    sweep: { feather: 96, run: size(3) },
  },
  // What is seen together arrives in reading order, a step apart; what comes
  // into view later starts where the eye already is, waiting at most a beat
  // for what came before it.
  items: { bend: 1.35, cards: size(-1), gap: size(-2), wait: size(0) },
  slides: {
    arrow: size(-1),
    gap: size(-2),
    glide: size(3),
    run: size(3),
    zoom: 1.14,
  },
  // A tab change is one breath: the old content lifts away quickly and the
  // new one starts arriving as soon as it has gone.
  swap: { lead: 0, leave: size(-1) },
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
      leave: size(1),
    },
    revisit: { pace: PHI },
  },
  undo: { cap: size(-2) },
  // The gallery taken down off the page and hung on its own. The page rolls
  // back up to its head, at a pace kept by how far it has to go, and goes
  // dark over the last stretch; the pictures are hung where it stood. Taken
  // down again, the wall goes dark and the page comes back up where the
  // gallery was left.
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
