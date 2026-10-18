// The canon hangs as a wall of one-sheets, read like a page: ten to a row,
// and a row runs on into the films of the rows below it, so going right
// carries on down the chart and nothing repeats for a hundred posters. The
// wall goes on in every direction, so it can be wandered without end.
//
// Two lenses sit between it and the eye: the whole wall bows toward the
// viewer, so the middle of the screen is near and the edges fall away, and a
// loupe follows the pointer, swelling whatever is under it. The shader draws
// through this same mapping, so what the pointer finds here is what is on
// screen.

export const COLUMNS = 10;
// Of each cell's pitch, the dark between one-sheets.
export const GAP = 0.14;
export const RATIO = 2 / 3;

export type Vec2 = [number, number];

export interface WallView {
  // How strongly the wall bows toward the viewer.
  bulge: number;
  // The loupe, in screen heights from the middle of the screen.
  focus: Vec2;
  height: number;
  // How much the loupe swells what is under it, 0..1.
  lens: number;
  // Where the wall is, in cells, at the middle of the screen.
  pan: Vec2;
  // One row of the wall, in pixels.
  pitch: number;
  // Reach of the loupe, in screen heights.
  radius: number;
  width: number;
}

export function pitches(pitch: number): Vec2 {
  const inner = pitch * (1 - GAP);
  return [inner * RATIO + pitch * GAP, pitch];
}

// The point of the wall, in cells, seen at a point of the screen.
export function wallAt(view: WallView, x: number, y: number): Vec2 {
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

// The inverse: the point of the screen at which a point of the wall is
// seen, found from a guess near it by a few steps of Newton's method.
export function screenAt(view: WallView, wall: Vec2, guess: Vec2): Vec2 {
  let x = guess[0];
  let y = guess[1];
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

// The outline of the one-sheet in a cell of the wall, on the screen: its
// corners and the middles of its sides, which the bow of the wall bends.
export function sheetOnScreen(
  view: WallView,
  cell: Vec2,
  guess: Vec2,
): { x: number; y: number }[] {
  const [px, py] = pitches(1);
  const halfW = ((1 - GAP) * RATIO) / 2 / px;
  const halfH = (1 - GAP) / 2 / py;
  const middle: Vec2 = [cell[0] + 0.5, cell[1] + 0.5];
  const points: { x: number; y: number }[] = [];
  for (const [u, v] of [
    [-1, -1],
    [0, -1],
    [1, -1],
    [1, 0],
    [1, 1],
    [0, 1],
    [-1, 1],
    [-1, 0],
  ] as const) {
    const [x, y] = screenAt(
      view,
      [middle[0] + u * halfW, middle[1] + v * halfH],
      guess,
    );
    points.push({ x, y });
  }
  return points;
}

const mod = (value: number, by: number) => ((value % by) + by) % by;

// The film in a cell of the wall.
export const filmIn = (x: number, y: number, count: number) =>
  mod(Math.floor(y) * COLUMNS + Math.floor(x), count);

// The film hanging at a point of the wall, or -1 for the dark between.
export function filmAt(wall: Vec2, count: number): number {
  if (count <= 0) return -1;
  const index = filmIn(wall[0], wall[1], count);
  const fx = wall[0] - Math.floor(wall[0]) - 0.5;
  const fy = wall[1] - Math.floor(wall[1]) - 0.5;
  const [px, py] = pitches(1);
  const halfW = ((1 - GAP) * RATIO) / 2;
  const halfH = (1 - GAP) / 2;
  return Math.abs(fx * px) <= halfW && Math.abs(fy * py) <= halfH ? index : -1;
}

// The middle of the copy of a film nearest a point of the wall. Every row
// holds each film once in each run of `count` cells, so the nearest copy is
// on one of the rows close by.
export function nearestCopy(index: number, around: Vec2, count: number): Vec2 {
  const row0 = Math.floor(around[1]);
  let best: Vec2 = [around[0], around[1]];
  let bestDistance = Number.POSITIVE_INFINITY;
  for (let row = row0 - 6; row <= row0 + 6; row += 1) {
    const first = mod(index - row * COLUMNS, count);
    const col = first + count * Math.round((around[0] - 0.5 - first) / count);
    const at: Vec2 = [col + 0.5, row + 0.5];
    // Cells are taller than they are wide; weigh rows by the same.
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
