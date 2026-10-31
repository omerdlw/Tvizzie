export const STEADY = 3;
export const STEADY_MIN = 4;
const STEADY_SHARE = 0.5;

export const nextSteady = (
  count: number,
  raw: number,
  lastRaw: number,
  peak: number,
) =>
  raw >= STEADY_MIN && raw >= lastRaw && raw >= peak * STEADY_SHARE
    ? count + 1
    : 0;
