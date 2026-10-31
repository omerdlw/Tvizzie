// The wall is an endless sheet of the hundred prints, ten to a row, that
// repeats in every direction. The screen looks at it through a lens: a
// gentle barrel over the whole view, and a stronger magnifier that rides
// under the hand. Wall coordinates count cells (x columns, y rows); a cell's
// print fills all of it but the gap.

export const COLUMNS = 10;
export const GAP = 0.2;
const RATIO = 2 / 3;

export type Vec2 = [number, number];

export interface View {
  bulge: number;
  /** Where the magnifier sits, in view units (height = 1, centre = 0). */
  focus: Vec2;
  height: number;
  /** How strongly the magnifier pulls the wall toward it. */
  lens: number;
  /** The wall coordinate at the centre of the screen. */
  pan: Vec2;
  /** A row's height on screen, in CSS pixels. */
  pitch: number;
  radius: number;
  width: number;
}

/** A cell's width and height on screen, before the lens. */
export function pitches(pitch: number): Vec2 {
  const inner = pitch * (1 - GAP);
  return [inner * RATIO + pitch * GAP, pitch];
}

/** The wall coordinate under a screen point (CSS pixels). */
export function wallAt(view: View, x: number, y: number): Vec2 {
  const cx = (x - view.width / 2) / view.height;
  const cy = (y - view.height / 2) / view.height;
  const dx = cx - view.focus[0];
  const dy = cy - view.focus[1];
  const g = Math.exp(-(dx * dx + dy * dy) / (view.radius * view.radius));
  const lx = view.focus[0] + dx * (1 - view.lens * g);
  const ly = view.focus[1] + dy * (1 - view.lens * g);
  const bow = 1 + view.bulge * (lx * lx + ly * ly);
  const [px, py] = pitches(view.pitch);
  return [
    (lx * bow * view.height) / px + view.pan[0],
    (ly * bow * view.height) / py + view.pan[1],
  ];
}

/** The screen point a wall coordinate shows at, by Newton's method. */
export function screenAt(view: View, wall: Vec2, guess: Vec2): Vec2 {
  let [x, y] = guess;
  const h = 0.5;
  for (let step = 0; step < 8; step += 1) {
    const at = wallAt(view, x, y);
    const ex = at[0] - wall[0];
    const ey = at[1] - wall[1];
    if (Math.abs(ex) < 1e-4 && Math.abs(ey) < 1e-4) break;
    const dx = wallAt(view, x + h, y);
    const dy = wallAt(view, x, y + h);
    const a = (dx[0] - at[0]) / h;
    const b = (dy[0] - at[0]) / h;
    const c = (dx[1] - at[1]) / h;
    const d = (dy[1] - at[1]) / h;
    const det = a * d - b * c;
    if (Math.abs(det) < 1e-12) break;
    x -= (d * ex - b * ey) / det;
    y -= (a * ey - c * ex) / det;
  }
  return [x, y];
}

const mod = (value: number, by: number) => ((value % by) + by) % by;

/** Which film a cell holds. */
export const filmIn = (x: number, y: number, count: number) =>
  mod(Math.floor(y) * COLUMNS + Math.floor(x), count);

/** The film whose print is under a wall coordinate, or -1 in a gap. */
export function filmAt(wall: Vec2, count: number): number {
  if (count <= 0) return -1;
  const fx = wall[0] - Math.floor(wall[0]) - 0.5;
  const fy = wall[1] - Math.floor(wall[1]) - 0.5;
  const [px, py] = pitches(1);
  const halfW = ((1 - GAP) * RATIO) / 2;
  const halfH = (1 - GAP) / 2;
  return Math.abs(fx * px) <= halfW && Math.abs(fy * py) <= halfH
    ? filmIn(wall[0], wall[1], count)
    : -1;
}

/** The middle of the copy of a film nearest a wall coordinate. */
export function nearestCopy(index: number, around: Vec2, count: number): Vec2 {
  const row0 = Math.floor(around[1]);
  let best: Vec2 = [around[0], around[1]];
  let bestDistance = Number.POSITIVE_INFINITY;
  for (let row = row0 - 6; row <= row0 + 6; row += 1) {
    const first = mod(index - row * COLUMNS, count);
    const col = first + count * Math.round((around[0] - 0.5 - first) / count);
    const at: Vec2 = [col + 0.5, row + 0.5];
    const dx = (at[0] - around[0]) * RATIO;
    const dy = at[1] - around[1];
    const distance = dx * dx + dy * dy;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = at;
    }
  }
  return best;
}

/** The on-screen box of the print in a cell, for anchoring DOM to it. */
export function printBox(
  view: View,
  cell: Vec2,
  guess: Vec2,
): { bottom: number; left: number; right: number; top: number } {
  const [px, py] = pitches(1);
  const halfW = ((1 - GAP) * RATIO) / 2 / px;
  const halfH = (1 - GAP) / 2 / py;
  const middle: Vec2 = [Math.floor(cell[0]) + 0.5, Math.floor(cell[1]) + 0.5];
  let left = Infinity;
  let right = -Infinity;
  let top = Infinity;
  let bottom = -Infinity;
  for (const [u, v] of [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ] as const) {
    const [x, y] = screenAt(
      view,
      [middle[0] + u * halfW, middle[1] + v * halfH],
      guess,
    );
    left = Math.min(left, x);
    right = Math.max(right, x);
    top = Math.min(top, y);
    bottom = Math.max(bottom, y);
  }
  return { bottom, left, right, top };
}
