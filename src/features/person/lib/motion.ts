import { PHI, hand, landed, size, spread } from "./tempo";

const OPEN = size(4);
const TITLE = OPEN;
const RULE = TITLE + size(1);
const BIO = RULE + size(0);
const BIO_WINDOW = size(3);
const BIO_LANDED = BIO + BIO_WINDOW + landed(2);

const DECODE = size(2);
const VALUE_LAG = size(-1);
const FACTS_WINDOW = BIO_LANDED - DECODE - VALUE_LAG - BIO;

const LINKS_RUN = size(2);
const LINKS_WINDOW = size(1);
const LINKS = BIO_LANDED - LINKS_WINDOW - LINKS_RUN;

export const SCENE = {
  backdrop: {
    at: 0,
    blur: 18,
    brightness: 0.25,
    run: OPEN,
    scaleFrom: 1.45,
  },
  title: { at: TITLE, run: size(3), window: size(1) },
  label: { at: RULE, run: size(1) },
  rule: { at: RULE + hand(1), run: size(3) },
  portrait: {
    at: TITLE,
    run: size(4),
    shine: { at: TITLE + size(4) / PHI, run: size(3) },
  },
  bio: { at: BIO, cap: size(-2), run: size(2), window: BIO_WINDOW },
  buttons: { at: RULE, gap: size(-2) },
  facts: {
    at: BIO,
    decode: DECODE,
    gap: size(-1),
    lag: VALUE_LAG,
    replay: size(1),
    window: FACTS_WINDOW,
  },
  links: { at: LINKS, cap: size(-3), run: LINKS_RUN, window: LINKS_WINDOW },
  count: { replay: size(2), run: size(3) },
  opening: {
    base: TITLE,
    end: BIO_LANDED,
    length: BIO_LANDED - TITLE + size(1),
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
  grid: { window: size(3) },
  slides: {
    arrow: size(-1),
    gap: size(-3),
    glide: size(3),
    run: size(3),
    zoom: 1.18,
  },
  career: {
    peak: { at: size(3), run: size(2) },
    readout: size(0),
    window: size(3),
  },
  timeline: { dot: size(1) },
  swap: { lead: size(-2), leave: size(0) },
  view: { enter: size(1), leave: size(0), lift: 20 },
  flow: { run: size(1) },
  layers: {
    bio: { opacity: [1, 0.2], range: [60, 640] },
    rule: { opacity: [1, 0.15], range: [20, 520] },
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
    portrait: size(-1),
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

export const linksGap = (count: number) =>
  spread(count, SCENE.links.window, SCENE.links.cap);

export const gridGap = (count: number) =>
  spread(count, SCENE.grid.window, SCENE.items.gap);

export const careerGap = (count: number) =>
  spread(count, SCENE.career.window, SCENE.items.gap);
