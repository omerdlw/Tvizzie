import { GRAMMAR, landed, size } from "@/motion/stage";

const END = GRAMMAR.title.at + GRAMMAR.title.run + landed(1);

/** The stage opening every spotlight page shares. */
export const SPOTLIGHT_OPENING = {
  end: END,
  length: END - GRAMMAR.opening.base + size(1),
};
