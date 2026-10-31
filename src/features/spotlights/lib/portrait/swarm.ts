import { tmdbImageUrl } from "@/infrastructure/tmdb/images";
import { loadBitmap, pixelsOf } from "../bitmap";
import type { Director } from "../types";

/** What a swarm is drawn from: one portrait and the films' posters. */
export interface SwarmSubject {
  films: readonly { posterPath: string }[];
  id: Director["id"];
  profilePath: Director["profilePath"];
}

export const subjectOf = (director: Director): SwarmSubject => ({
  films: director.films.map(({ posterPath }) => ({ posterPath })),
  id: director.id,
  profilePath: director.profilePath,
});

/** A director's portrait, made of particles that each carry one film's colour. */
export interface Swarm {
  /** rgb per particle where it settles in the face. */
  color: Float32Array;
  count: number;
  /** Cell of the portrait each particle settles in, 0..1. */
  face: Float32Array;
  faceGrid: [number, number];
  /**
   * RGBA per face cell: the backdrop's colour there (a clean plate the
   * photograph is keyed against), and how near the cell is to backdrop the
   * edges reach, where the photograph may be keyed at all.
   */
  matte: Uint8Array;
  /** Spot on its own film's poster each particle starts from, 0..1. */
  home: Float32Array;
  /** film index, seed, the light of its cell. */
  meta: Float32Array;
  posterGrid: [number, number];
  /** rgb per particle as it sits on its poster. */
  source: Float32Array;
}

const LUMA = [0.2126, 0.7152, 0.0722] as const;
const LATTICE = Math.sqrt(3) / 2;
/** How near the edges' colour a cell must be to seed the backdrop. */
const BACKDROP_REACH = 0.12;
/** How far the backdrop may drift from that colour as it grows. */
const BACKDROP_SPAN = 0.4;
/** The largest step between neighbours the backdrop grows across. */
const BACKDROP_STEP = 0.045;

/**
 * The portrait's light falls off from the face: the swarm and the
 * photograph both fade by this. Keep in step with PHOTO_FRAGMENT.
 */
export const vignetteAt = (u: number, v: number) => {
  const edge = Math.hypot((u - 0.5) / 0.5, (v - 0.4) / 0.62);
  const t = Math.min(1, Math.max(0, (1.1 - edge) / 0.75));
  return t * t * (3 - 2 * t);
};

// Two running-sum box passes each way come close to a gaussian.
function soften(
  field: Float32Array,
  columns: number,
  rows: number,
  radius: number,
): void {
  const line = new Float32Array(Math.max(columns, rows));
  const pass = (count: number, stride: number, start: number) => {
    for (let i = 0; i < count; i += 1) line[i] = field[start + i * stride]!;
    let sum = 0;
    for (let i = -radius; i <= radius; i += 1) {
      sum += line[Math.min(count - 1, Math.max(0, i))]!;
    }
    for (let i = 0; i < count; i += 1) {
      field[start + i * stride] = sum / (radius * 2 + 1);
      sum += line[Math.min(count - 1, i + radius + 1)]!;
      sum -= line[Math.max(0, i - radius)]!;
    }
  };
  for (let round = 0; round < 2; round += 1) {
    for (let y = 0; y < rows; y += 1) pass(columns, 1, y * columns);
    for (let x = 0; x < columns; x += 1) pass(rows, columns, x);
  }
}

const lightAt = (pixels: Uint8ClampedArray, i: number) =>
  (pixels[i * 4]! * LUMA[0] +
    pixels[i * 4 + 1]! * LUMA[1] +
    pixels[i * 4 + 2]! * LUMA[2]) /
  255;

const linear = (c: number) =>
  c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
const encoded = (c: number) =>
  c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055;

/** sRGB 0..1 to OKLab. */
function oklab(r: number, g: number, b: number): [number, number, number] {
  const [lr, lg, lb] = [linear(r), linear(g), linear(b)];
  const l = Math.cbrt(
    0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb,
  );
  const m = Math.cbrt(
    0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb,
  );
  const s = Math.cbrt(
    0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb,
  );
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

const random = (seed: number) => {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
};

// The face is matched to the films by light: the portrait's cells and the
// posters' samples are each sorted from dark to bright and paired in that
// order, so the brightest spots of every poster build the brightest parts
// of the face. Within each band of light the pairing then runs by hue
// across the face, so the colours in flight travel as broad washes instead
// of confetti. Each particle leaves its poster in that poster's colour and
// lands in the portrait's own grey: the swarm only carries the likeness in,
// and the photograph itself develops over it (see the renderer). The face
// is a hexagonal screen with no jitter.
export async function gatherSwarm(
  director: SwarmSubject,
  columns: number,
  signal?: AbortSignal,
): Promise<Swarm | null> {
  // A hexagonal screen: odd rows sit half a cell over, rows √3/2 apart.
  const faceGrid: [number, number] = [
    columns,
    Math.round((columns * 1.5) / LATTICE),
  ];
  const cells = faceGrid[0] * faceGrid[1];
  const profile = tmdbImageUrl("profile", director.profilePath, "h632");
  const [portrait, ...posters] = await Promise.all([
    profile ? loadBitmap(profile, { signal }) : null,
    ...director.films.map((film) => {
      // Each poster gives the face a few thousand samples at most, which
      // the smallest size carries.
      const src = tmdbImageUrl("poster", film.posterPath, "w92");
      return src ? loadBitmap(src, { signal }) : null;
    }),
  ]);
  if (!portrait || signal?.aborted) return null;

  const films = posters.flatMap((bitmap, film) =>
    bitmap ? [{ bitmap, film }] : [],
  );
  if (films.length === 0) return null;
  const per = Math.floor(cells / films.length);
  const rows = Math.round(Math.sqrt(per * 1.5));
  const posterGrid: [number, number] = [Math.floor(per / rows), rows];
  const samples = posterGrid[0] * posterGrid[1];
  const count = samples * films.length;

  const face = pixelsOf(portrait, faceGrid[0], faceGrid[1]);
  portrait.close();
  if (!face) return null;
  // Studio portraits sit on plain backdrops, often pale and rarely even.
  // Backdrop is grown in from the top and side edges, cell by cell, through
  // neighbours of nearly the same colour, so it follows a backdrop's
  // gradient up to the sitter's outline and stops there: a lit cheek can
  // match a pale backdrop's colour, but the outline walls it off.
  const [columnsOf, rowsOf] = faceGrid;
  const rgb = (i: number, c: number) => face[i * 4 + c]! / 255;
  const between = (i: number, j: number) =>
    Math.hypot(
      rgb(i, 0) - rgb(j, 0),
      rgb(i, 1) - rgb(j, 1),
      rgb(i, 2) - rgb(j, 2),
    );
  const seeds: number[] = [];
  for (let x = 0; x < columnsOf; x += 1) seeds.push(x);
  for (let y = 1; y < rowsOf * 0.7; y += 1) {
    seeds.push(y * columnsOf, y * columnsOf + columnsOf - 1);
  }
  const behind = [0, 1, 2].map(
    (c) => seeds.reduce((sum, i) => sum + rgb(i, c), 0) / seeds.length,
  );
  const apart = (i: number) =>
    Math.hypot(
      rgb(i, 0) - behind[0]!,
      rgb(i, 1) - behind[1]!,
      rgb(i, 2) - behind[2]!,
    );
  const backdropped = new Uint8Array(cells);
  const queue = new Int32Array(cells);
  let tail = 0;
  const reach = (i: number, from: number) => {
    if (backdropped[i] || apart(i) >= BACKDROP_SPAN) return;
    if (between(i, from) >= BACKDROP_STEP) return;
    backdropped[i] = 1;
    queue[tail++] = i;
  };
  for (const i of seeds) {
    if (backdropped[i] || apart(i) >= BACKDROP_REACH) continue;
    backdropped[i] = 1;
    queue[tail++] = i;
  }
  for (let head = 0; head < tail; head += 1) {
    const i = queue[head]!;
    const x = i % columnsOf;
    if (x > 0) reach(i - 1, i);
    if (x < columnsOf - 1) reach(i + 1, i);
    if (i >= columnsOf) reach(i - columnsOf, i);
    if (i + columnsOf < cells) reach(i + columnsOf, i);
  }
  // A clean plate: the backdrop's own colour, carried a few cells in under
  // the sitter, for the photograph to be keyed against.
  const plate = [0, 1, 2].map(() => new Float32Array(cells));
  const near = new Float32Array(cells);
  for (let i = 0; i < cells; i += 1) {
    if (!backdropped[i]) continue;
    for (let c = 0; c < 3; c += 1) plate[c]![i] = rgb(i, c);
    near[i] = 1;
  }
  for (const field of [...plate, near]) soften(field, columnsOf, rowsOf, 4);
  const plateAt = (i: number, c: number) =>
    near[i]! > 1e-3 ? plate[c]![i]! / near[i]! : behind[c]!;

  const faceLight = new Float32Array(cells);
  for (let i = 0; i < cells; i += 1) {
    const u = ((i % columnsOf) + 0.5) / columnsOf;
    const v = (Math.floor(i / columnsOf) + 0.5) / rowsOf;
    const sitter = backdropped[i]
      ? Math.min(
          1,
          Math.max(
            0,
            (Math.hypot(
              rgb(i, 0) - plateAt(i, 0),
              rgb(i, 1) - plateAt(i, 1),
              rgb(i, 2) - plateAt(i, 2),
            ) -
              0.07) /
              0.16,
          ),
        )
      : 1;
    faceLight[i] =
      lightAt(face, i) * vignetteAt(u, v) * sitter * sitter * (3 - 2 * sitter);
  }
  const sortedLight = Float32Array.from(faceLight).sort();
  const floor = sortedLight[Math.floor(cells * 0.04)]!;
  const ceiling = sortedLight[Math.floor(cells * 0.985)]! || 1;
  for (let i = 0; i < cells; i += 1) {
    const t = Math.min(
      1,
      Math.max(0, (faceLight[i]! - floor) / (ceiling - floor)),
    );
    faceLight[i] = t ** 1.15;
  }

  const sourcePixels: Uint8ClampedArray[] = [];
  for (const { bitmap } of films) {
    sourcePixels.push(
      pixelsOf(bitmap, posterGrid[0], posterGrid[1]) ??
        new Uint8ClampedArray(samples * 4),
    );
    bitmap.close();
  }
  const sourceLab = new Float32Array(count * 3);
  for (let f = 0; f < films.length; f += 1) {
    const pixels = sourcePixels[f]!;
    for (let s = 0; s < samples; s += 1) {
      sourceLab.set(
        oklab(
          pixels[s * 4]! / 255,
          pixels[s * 4 + 1]! / 255,
          pixels[s * 4 + 2]! / 255,
        ),
        (f * samples + s) * 3,
      );
    }
  }
  const hueOf = (i: number) =>
    Math.atan2(sourceLab[i * 3 + 2]!, sourceLab[i * 3 + 1]!);
  // A diagonal sweep: where on the face a hue lands within its band.
  const sweep = (cell: number) =>
    (cell % columnsOf) / columnsOf +
    (Math.floor(cell / columnsOf) / rowsOf) * 0.6;

  const byFace = Array.from({ length: cells }, (_, i) => i).sort(
    (a, b) => faceLight[a]! - faceLight[b]!,
  );
  const bySource = Array.from({ length: count }, (_, i) => i).sort(
    (a, b) => sourceLab[a * 3]! - sourceLab[b * 3]!,
  );
  // More cells than samples: the darkest cells go without, they read as black.
  const lit = byFace.slice(cells - count);
  const BAND = 640;
  for (let start = 0; start < count; start += BAND) {
    const end = Math.min(count, start + BAND);
    const faces = lit.slice(start, end).sort((a, b) => sweep(a) - sweep(b));
    const sources = bySource
      .slice(start, end)
      .sort((a, b) => hueOf(a) - hueOf(b));
    lit.splice(start, faces.length, ...faces);
    bySource.splice(start, sources.length, ...sources);
  }

  const home = new Float32Array(count * 2);
  const faceAt = new Float32Array(count * 2);
  const color = new Float32Array(count * 3);
  const source = new Float32Array(count * 3);
  const meta = new Float32Array(count * 3);
  const next = random(director.id);
  for (let k = 0; k < count; k += 1) {
    const cell = lit[k]!;
    const from = bySource[k]!;
    const f = Math.floor(from / samples);
    const s = from % samples;
    home.set(
      [
        ((s % posterGrid[0]) + 0.5) / posterGrid[0],
        (Math.floor(s / posterGrid[0]) + 0.5) / posterGrid[1],
      ],
      k * 2,
    );
    const row = Math.floor(cell / faceGrid[0]);
    faceAt.set(
      [
        ((cell % faceGrid[0]) + 0.25 + (row % 2) * 0.5) / faceGrid[0],
        (row + 0.5) / faceGrid[1],
      ],
      k * 2,
    );
    const pixels = sourcePixels[f]!;
    source.set(
      [0, 1, 2].map((c) => pixels[s * 4 + c]! / 255),
      k * 3,
    );
    // The portrait's lightness, in an even, slightly warm silver.
    const light = faceLight[cell]!;
    const grey = encoded((0.05 + light * 0.82) ** 3);
    color.set([grey, grey * 0.985, grey * 0.96], k * 3);
    meta.set([films[f]!.film, next(), light], k * 3);
  }

  // The photograph is keyed per pixel, at its own resolution, against the
  // plate, and only near backdrop the edges reached: hair keeps its strands
  // and a pale cheek inside the outline is never keyed away.
  const matte = new Uint8Array(cells * 4);
  for (let i = 0; i < cells; i += 1) {
    for (let c = 0; c < 3; c += 1) {
      matte[i * 4 + c] = Math.round(plateAt(i, c) * 255);
    }
    matte[i * 4 + 3] = Math.round(Math.min(1, near[i]! * 4) * 255);
  }

  return {
    color,
    count,
    face: faceAt,
    faceGrid,
    matte,
    home,
    meta,
    posterGrid,
    source,
  };
}
