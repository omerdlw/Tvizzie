import type { WordRaster } from "./glyphs";

// The opening is the week's films broken into tiles, measured in screens of
// scroll:
//
//   (load)  the tiles stream in out of the dark and lock together into the
//           word, each letter a window onto a different film, the second I
//           a window onto the band itself, seen from up close
//   zoom    the camera flies into that I until it fills the frame
//   settle  the camera pulls back out of the band, the other films coming in
//           round the one it came through
//   hold    the band of the week's films, side by side, the film being
//           looked at opened out the widest
//   outro   the band bursts, at us, and the tiles rush past the camera; the
//           dark behind the band clears off the corridor, which is there
//           under it, and its lights wake as the last of the band goes by

export const SPAN = {
  // Before the zoom, a breath for the hero cue to go.
  lead: 0.05,
  zoom: 1,
  settle: 0.65,
  hold: 0.5,
  outro: 0.8,
} as const;

// Where the band has landed whole, in screens from the top of the opening.
export const REST = SPAN.lead + SPAN.zoom + SPAN.settle;
export const LENGTH = REST + SPAN.hold + SPAN.outro;

export interface Scene {
  // The dark behind the band, 0..1: under it is the corridor.
  backdrop: number;
  // The copy round the band, 0..1.
  copy: number;
  exposure: number;
  // The hero cue, 0..1.
  hero: number;
  // Through the I and into the band: the tiles stand in the word until then.
  landed: boolean;
  // From the band to past the camera, 0..1.
  outro: number;
  // The camera pulling back out of the band, 0..1, eased.
  settle: number;
  // From the word to the band, as scrolled, 0..1.
  travel: number;
  // The camera flying into the I, 0..1, eased.
  zoom: number;
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const smooth = (t: number) => t * t * (3 - 2 * t);
const ramp = (value: number, a: number, b: number) =>
  smooth(clamp01((value - a) / (b - a)));
const inOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;

export function sceneAt(s: number): Scene {
  const into = (s - SPAN.lead) / SPAN.zoom;
  const back = (s - SPAN.lead - SPAN.zoom) / SPAN.settle;
  const outro = clamp01((s - REST - SPAN.hold) / SPAN.outro);
  return {
    backdrop: 1 - ramp(outro, 0.04, 0.4),
    // The words come once the camera has stood still, and go before the
    // band moves.
    copy: ramp(back, 0.65, 1) * (1 - ramp(outro, 0, 0.12)),
    // The tiles stay lit as they go by; the nearest dim as they pass.
    exposure: 1 - 0.35 * ramp(outro, 0.55, 1),
    hero: 1 - ramp(s, 0.02, 0.2),
    landed: into >= 1,
    outro,
    settle: inOutCubic(ramp(back, 0, 0.75)),
    travel: clamp01((s - SPAN.lead) / (SPAN.zoom + SPAN.settle)),
    zoom: inOutCubic(clamp01(into)),
  };
}

// Every film in the band is a slice cut into this many tiles across it and
// along it.
export const ACROSS = 14;
export const ALONG = 48;
// The share of the band the film being looked at opens out to, against one
// for each of the others.
export const OPENED = 6;
// The gap between two slices, in CSS pixels.
export const SLICE_GAP = 6;

// A share of the word's tiles, by count, that are kept in the word; the rest
// drift round it as loose shards, further off.
const IN_WORD = 0.82;
// A cell is in the word when this much of the type's soft field reaches any
// of its corners or its middle, a little under the cut, so that the cut has
// a tile under every edge of the letters to clip clean.
const COVERED = 0.4;

// Per tile: where it sits in the word (x, y as a share of the word's box,
// depth as a share of the camera's distance, size as a share of the box's
// height), where it sits in the band (slice, across, along, the letter whose
// film it shows in the word or -1), and four numbers of its own.
export const STRIDE = 12;

export interface Tiles {
  count: number;
  data: Float32Array;
}

const random = (seed: number) => {
  let state = seed >>> 0 || 1;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };
};

const clampTo = (value: number, size: number) =>
  Math.min(size - 1, Math.max(0, value));

interface Cell {
  letter: number;
  x: number;
  y: number;
}

// The word's cells, a square grid `step` pixels apart over the raster.
function cellsOf(raster: WordRaster, alpha: Uint8ClampedArray, step: number) {
  const { canvas, edges, ink } = raster;
  const cells: Cell[] = [];
  const width = canvas.width;
  const height = canvas.height;
  const at = (x: number, y: number) =>
    alpha[
      (clampTo(Math.floor(y), height) * width + clampTo(Math.floor(x), width)) *
        4 +
        3
    ]!;
  const reach = step * 0.45;
  for (let y = ink.y + step / 2; y < ink.y + ink.h; y += step) {
    for (let x = ink.x + step / 2; x < ink.x + ink.w; x += step) {
      const covered = Math.max(
        at(x, y),
        at(x - reach, y - reach),
        at(x + reach, y - reach),
        at(x - reach, y + reach),
        at(x + reach, y + reach),
      );
      if (covered < COVERED * 255) continue;
      const u = x / width;
      let letter = 0;
      while (letter < edges.length - 2 && u > edges[letter + 1]!) letter += 1;
      cells.push({ letter, x: u, y: y / canvas.height });
    }
  }
  return cells;
}

// Lays the tiles out for a word and a band of `films` slices. The word is
// sampled finer or coarser until it takes about the share of the tiles it
// should; the tiles are matched to its cells left to right, so the left of
// the word goes to the left of the band.
export function planTiles(raster: WordRaster, films: number): Tiles {
  const count = Math.max(1, films) * ACROSS * ALONG;
  const ctx = raster.canvas.getContext("2d");
  const alpha = ctx
    ? ctx.getImageData(0, 0, raster.canvas.width, raster.canvas.height).data
    : new Uint8ClampedArray(raster.canvas.width * raster.canvas.height * 4);

  const want = Math.round(count * IN_WORD);
  let low = 1;
  let high = Math.max(raster.ink.w, raster.ink.h) / 4;
  let cells: Cell[] = [];
  let step = high;
  for (let i = 0; i < 18; i += 1) {
    step = (low + high) / 2;
    cells = cellsOf(raster, alpha, step);
    if (cells.length > count) low = step;
    else if (cells.length < want) high = step;
    else break;
  }
  if (cells.length > count) cells = cells.slice(0, count);

  const next = random(0x7a11 + films);
  const data = new Float32Array(count * STRIDE);
  const size = step / raster.canvas.height;

  // The tiles in the order they stand across the band, give or take.
  const order = Array.from({ length: count }, (_, i) => {
    const slice = Math.floor(i / (ACROSS * ALONG));
    const across = (i % ACROSS) + 0.5;
    return { i, x: (slice + across / ACROSS) / films + (next() - 0.5) * 0.02 };
  }).sort((a, b) => a.x - b.x);
  const word = cells
    .map((cell) => ({ cell, x: cell.x + (next() - 0.5) * 0.02 }))
    .sort((a, b) => a.x - b.x);
  const taken = new Int32Array(count).fill(-1);
  word.forEach((_, k) => {
    taken[order[Math.floor(((k + 0.5) * count) / word.length)]!.i] = k;
  });

  for (let i = 0; i < count; i += 1) {
    const o = i * STRIDE;
    const slice = Math.floor(i / (ACROSS * ALONG));
    const within = i % (ACROSS * ALONG);
    const k = taken[i]!;
    if (k >= 0) {
      const { cell } = word[k]!;
      data[o] = cell.x;
      data[o + 1] = cell.y;
      data[o + 2] = 0;
      data[o + 3] = size;
      data[o + 7] = cell.letter;
    } else {
      // A loose shard, somewhere about the word and behind it.
      data[o] = -0.35 + next() * 1.7;
      data[o + 1] = -0.9 + next() * 2.8;
      data[o + 2] = -(0.35 + next() ** 1.5 * 2.4);
      data[o + 3] = size * (0.7 + next() * 0.9);
      data[o + 7] = -1;
    }
    data[o + 4] = slice;
    data[o + 5] = ((within % ACROSS) + 0.5) / ACROSS;
    data[o + 6] = (Math.floor(within / ACROSS) + 0.5) / ALONG;
    data[o + 8] = next();
    data[o + 9] = next();
    data[o + 10] = next();
    data[o + 11] = next();
  }

  return { count, data };
}

// How the band is shared out between its slices, by weight, in pixels along
// it: where each slice starts and how long it is.
export function shareBand(
  weights: readonly number[],
  length: number,
  gap: number,
  starts: Float32Array,
  sizes: Float32Array,
): void {
  const total = weights.reduce((sum, weight) => sum + weight, 0) || 1;
  const room = Math.max(0, length - gap * (weights.length - 1));
  let at = 0;
  weights.forEach((weight, i) => {
    const size = (room * weight) / total;
    starts[i] = at;
    sizes[i] = size;
    at += size + gap;
  });
}
