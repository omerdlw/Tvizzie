import { GRAMMAR, PHI, hand, landed, size, spread } from "@/motion/stage";

const TITLE = GRAMMAR.opening.base;
const RULE = TITLE + size(1);
const BIO = RULE + size(0);
const BIO_WINDOW = size(1);
const BIO_SWEEP = size(-2);
const BIO_LANDED = BIO + BIO_WINDOW + BIO_SWEEP + landed(2);

const { expose: EXPOSE, lag: VALUE_LAG } = GRAMMAR.facts;
const FACTS_WINDOW = BIO_LANDED - EXPOSE - VALUE_LAG - BIO;

const LINKS_RUN = size(2);
const LINKS_WINDOW = size(1);
const LINKS = BIO_LANDED - LINKS_WINDOW - LINKS_RUN;

export const SCENE = {
  ...GRAMMAR,
  label: { at: RULE, run: size(1) },
  rule: { at: RULE + hand(1), run: size(3) },
  portrait: {
    at: TITLE,
    run: size(4),
    shine: { at: TITLE + size(4) / PHI, run: size(3) },
  },
  bio: {
    at: BIO,
    by: "line",
    cap: size(-1),
    run: size(2),
    sweep: BIO_SWEEP,
    window: BIO_WINDOW,
  },
  buttons: { at: RULE, gap: size(-2) },
  facts: { ...GRAMMAR.facts, at: BIO, window: FACTS_WINDOW },
  links: { at: LINKS, cap: size(-3), run: LINKS_RUN, window: LINKS_WINDOW },
  opening: {
    base: TITLE,
    end: BIO_LANDED,
    length: BIO_LANDED - TITLE + size(1),
  },
  grid: { window: size(3) },
  career: {
    peak: { at: size(3), run: size(2) },
    readout: size(0),
    window: size(3),
  },
  timeline: { dot: size(1) },
  layers: {
    bio: { opacity: [1, 0.2], range: [60, 640] },
    rule: { opacity: [1, 0.15], range: [20, 520] },
    title: { opacity: [1, 0.15], range: [0, 560] },
  },
} as const;

export { sinceBase, undoGap } from "@/motion/stage";

export const factsGap = (count: number) =>
  spread(count, SCENE.facts.window, SCENE.facts.gap);

export const linksGap = (count: number) =>
  spread(count, SCENE.links.window, SCENE.links.cap);

export const gridGap = (count: number) =>
  spread(count, SCENE.grid.window, SCENE.items.gap);

export const careerGap = (count: number) =>
  spread(count, SCENE.career.window, SCENE.items.gap);
