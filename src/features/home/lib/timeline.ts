// The opening is one long shot, measured in screens of scroll:
//
//   zoom    the camera flies into the second I of the word until the film
//           behind it fills the frame
//   settle  the camera pulls back: the film becomes a screen in a dark room,
//           its light spilling onto the walls and the floor
//   items   each film of the week holds, then the next one comes through a
//           pane of reeded glass that slides across the screen
//   outro   the screen goes dark

export const SPAN = {
  hold: 0.38,
  item: 1.35,
  outro: 0.9,
  settle: 1.15,
  zoom: 1.7,
} as const;

export interface Scene {
  // Which film is settled on, for the copy.
  active: number;
  // Copy around the screen, 0..1.
  copy: number;
  exposure: number;
  filmA: number;
  filmB: number;
  // 1 shows the film sharp across the whole frame while the word is up.
  flood: number;
  // 0 is the whole canvas, 1 the screen.
  frame: number;
  // The hero cue, 0..1.
  hero: number;
  mix: number;
  // 0 masks with the word, 1 with the screen.
  mode: number;
  // Continuous position through the week, 0..1.
  progress: number;
  zoom: number;
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const smooth = (t: number) => t * t * (3 - 2 * t);
export const ramp = (value: number, a: number, b: number) =>
  smooth(clamp01((value - a) / (b - a)));
const inOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
const inOutSine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2;

const start = SPAN.zoom + SPAN.settle;

export function timelineLength(films: number): number {
  if (films === 0) return SPAN.zoom;
  return start + (films - 1) * SPAN.item + SPAN.item * SPAN.hold + SPAN.outro;
}

// The stretch, in screens from the top of the opening, over which film
// `index` stands still.
export function stillness(index: number): readonly [number, number] {
  const from = start + index * SPAN.item;
  return [from, from + SPAN.item * SPAN.hold];
}

export function sceneAt(s: number, films: number): Scene {
  const scene: Scene = {
    active: 0,
    copy: 0,
    exposure: 1,
    filmA: 0,
    filmB: 0,
    flood: 0,
    frame: 0,
    hero: 1 - ramp(s, 0.02, 0.2),
    mix: 0,
    mode: 0,
    progress: 0,
    zoom: 0,
  };

  if (s < SPAN.zoom || films === 0) {
    const p = clamp01(s / SPAN.zoom);
    scene.zoom = inOutCubic(p);
    scene.flood = films === 0 ? 0 : ramp(p, 0.84, 1);
    return scene;
  }

  scene.zoom = 1;
  scene.mode = 1;

  if (s < start) {
    const u = (s - SPAN.zoom) / SPAN.settle;
    scene.frame = inOutCubic(ramp(u, 0.04, 0.8));
    scene.copy = ramp(u, 0.6, 1);
    return scene;
  }

  scene.frame = 1;
  scene.copy = 1;
  const t = s - start;
  const last = films - 1;
  const index = Math.min(last, Math.floor(t / SPAN.item));
  const within = (t - index * SPAN.item) / SPAN.item;
  scene.progress = clamp01(
    (index + ramp(within, SPAN.hold, 1)) / Math.max(1, last),
  );

  if (index === last) {
    const o = clamp01(
      (t - last * SPAN.item - SPAN.item * SPAN.hold) / SPAN.outro,
    );
    scene.active = last;
    scene.filmA = last;
    scene.filmB = last;
    scene.copy = 1 - ramp(o, 0, 0.45);
    scene.exposure = 1 - ramp(o, 0.2, 1);
    return scene;
  }

  scene.mix = inOutSine(clamp01((within - SPAN.hold) / (1 - SPAN.hold)));
  scene.active = scene.mix < 0.5 ? index : index + 1;
  scene.filmA = index;
  scene.filmB = index + 1;
  return scene;
}
