import { GRAMMAR, PHI, landed, size, spread } from "@/motion/stage";

const TITLE = GRAMMAR.opening.base;
const RULE = TITLE + size(1);
const TAGLINE = RULE + size(0);
const OVERVIEW = TAGLINE + size(-1);
const OVERVIEW_WINDOW = size(1);
const OVERVIEW_SWEEP = size(-2);
const OVERVIEW_LANDED = OVERVIEW + OVERVIEW_WINDOW + OVERVIEW_SWEEP + landed(2);

const { expose: EXPOSE, lag: VALUE_LAG } = GRAMMAR.facts;
const FACTS_WINDOW = OVERVIEW_LANDED - EXPOSE - VALUE_LAG - TAGLINE;

export const SCENE = {
  ...GRAMMAR,
  rule: { at: RULE, run: size(4) },
  poster: {
    at: TITLE,
    run: size(4),
    shine: { at: TITLE + size(4) / PHI, run: size(3) },
  },
  tagline: { at: TAGLINE, cap: size(-1), run: size(2), window: size(1) },
  overview: {
    at: OVERVIEW,
    by: "line",
    cap: size(-1),
    run: size(2),
    sweep: OVERVIEW_SWEEP,
    window: OVERVIEW_WINDOW,
  },
  buttons: { at: RULE, gap: size(-2) },
  facts: { ...GRAMMAR.facts, at: TAGLINE, window: FACTS_WINDOW },
  opening: {
    base: TITLE,
    end: OVERVIEW_LANDED,
    length: OVERVIEW_LANDED - TITLE + size(1),
  },
  stars: { at: size(1), gap: size(-2), run: size(2) },
  layers: {
    overview: { opacity: [1, 0.2], range: [60, 640] },
    rule: { opacity: [1, 0.15], range: [20, 520] },
    tagline: { opacity: [1, 0.25], range: [0, 520] },
    title: { opacity: [1, 0.15], range: [0, 560] },
  },
} as const;

export { sinceBase, undoGap } from "@/motion/stage";

export const factsGap = (count: number) =>
  spread(count, SCENE.facts.window, SCENE.facts.gap);
