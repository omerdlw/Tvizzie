import { PHI, hand, landed, size, spread } from "./tempo";

const OPEN = size(4);
const TITLE = OPEN;
const RULE = TITLE + size(1);
const TAGLINE = RULE + size(0);
const OVERVIEW = TAGLINE + size(-1);
const OVERVIEW_WINDOW = size(3);
const OVERVIEW_LANDED = OVERVIEW + OVERVIEW_WINDOW + landed(2);

const DECODE = size(2);
const VALUE_LAG = size(-1);
const FACTS_WINDOW = OVERVIEW_LANDED - DECODE - VALUE_LAG - TAGLINE;

export const SCENE = {
  backdrop: {
    at: 0,
    blur: 18,
    brightness: 0.25,
    run: OPEN,
    scaleFrom: 1.45,
  },
  title: { at: TITLE, run: size(3), window: size(1) },
  rule: { at: RULE, run: size(4) },
  poster: {
    at: TITLE,
    run: size(4),
    shine: { at: TITLE + size(4) / PHI, run: size(3) },
  },
  tagline: { at: TAGLINE, cap: size(-1), run: size(2), window: size(1) },
  overview: {
    at: OVERVIEW,
    cap: size(-2),
    run: size(2),
    window: OVERVIEW_WINDOW,
  },
  buttons: { at: RULE, gap: size(-2) },
  facts: {
    at: TAGLINE,
    decode: DECODE,
    gap: size(-1),
    lag: VALUE_LAG,
    replay: size(1),
    window: FACTS_WINDOW,
  },
  count: { replay: size(2), run: size(3) },
  opening: {
    base: TITLE,
    end: OVERVIEW_LANDED,
    length: OVERVIEW_LANDED - TITLE + size(1),
  },
  section: {
    actions: { at: size(0), run: size(2) },
    lead: size(0),
    name: { at: 0, run: size(1) },
    patience: size(0),
    rule: { at: hand(1), run: size(2) },
    stride: size(-1),
    tail: size(-1),
    y: 18,
  },
  items: { bend: 1.35, cards: size(-1), gap: size(-3) },
  slides: {
    arrow: size(-1),
    gap: size(-3),
    glide: size(3),
    run: size(3),
    zoom: 1.18,
  },
  stars: { at: size(1), gap: size(-2), run: size(2) },
  swap: { lead: size(-2), leave: size(0) },
  view: { enter: size(1), leave: size(0), lift: 20 },
  flow: { run: size(1) },
  layers: {
    overview: { opacity: [1, 0.2], range: [60, 640] },
    rule: { opacity: [1, 0.15], range: [20, 520] },
    tagline: { opacity: [1, 0.25], range: [0, 520] },
    title: { opacity: [1, 0.15], range: [0, 560] },
  },
  scrub: {
    defocus: { range: [24, 560] },
    drift: 8,
    push: 0.12,
  },
  exit: {
    backdrop: size(0),
    body: size(0),
    poster: size(-1),
    run: size(1),
    wait: size(2),
    window: size(0),
  },
  frame: {
    bars: { at: 0, height: 11, run: OPEN, shut: 50 },
    light: size(4),
  },
  film: {
    arrive: size(3),
    carry: { reveal: size(2), run: size(2) },
    cue: { hold: size(-2), marks: [0, size(2) - size(-1)] },
    halation: 0.55,
    house: { level: 0.8, run: size(3) },
    intermission: {
      after: size(8),
      drift: size(9),
      enter: size(4),
      leave: size(0),
    },
  },
  undo: { cap: size(-2) },
} as const;

export const sinceBase = (at: number) => at - SCENE.opening.base;

export const factsGap = (count: number) =>
  spread(count, SCENE.facts.window, SCENE.facts.gap);

export const undoGap = (count: number) =>
  spread(count, SCENE.exit.window, SCENE.undo.cap);
