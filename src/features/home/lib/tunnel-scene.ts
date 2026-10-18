// The tunnel is a corridor through time, laid along -z. Walking it is walking
// the calendar: the films in theatres hang where they opened, the camera
// crosses a threshold of light that is today, and the films still to open
// wait at their own dates beyond it. Distance stands for days, pressed
// together where the calendar is empty so the walk never drags.
// Past the last film the corridor runs on into the dark and ends in a
// doorway, and through it is the next section.
// Units are metres of corridor, more or less; the camera rides the axis.

import { PAST_DOOR } from "./portal";
import { SPAN } from "./shatter";

export type Chapter = "theatres" | "soon";

export interface Poster {
  chapter: Chapter;
  // Days from today; negative for films already out.
  day: number;
  h: number;
  // Index into the whole walk, theatres first.
  index: number;
  side: 1 | -1;
  w: number;
  x: number;
  y: number;
  yaw: number;
  z: number;
}

export interface Corridor {
  ceiling: number;
  floor: number;
  half: number;
}

export interface TunnelPlan {
  // Day and depth pairs the calendar is laid by, nearest first.
  anchors: { day: number; z: number }[];
  corridor: Corridor;
  // Where the camera stops, just through the doorway.
  end: number;
  gate: number;
  // In screens of scroll.
  length: number;
  // The doorway at the end of the corridor.
  portal: number;
  posters: Poster[];
  start: number;
}

export interface Dated {
  chapter: Chapter;
  day: number;
}

// Screens of scroll the tunnel lies under the end of the opening: the band
// bursts at the camera and the corridor is behind it, the camera already
// walking it.
export const OVERLAP = SPAN.outro;
// Corridor travelled per screen of scroll.
const UNITS = 3.6;
// Where the camera stands when the band bursts; it comes to rest with the
// first film a step ahead, as far in as before the overlap was longer.
const START = 1.44 + OVERLAP * UNITS;
// The dark stretch between the last film and the doorway.
const RUN_OUT = 6;
const FOCUS = 2.6;
const PAST = 1.0;

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const smooth = (t: number) => t * t * (3 - 2 * t);
const ramp = (value: number, a: number, b: number) =>
  smooth(clamp01((value - a) / (b - a)));

// The gap between two films grows with the days between them, slowly, so a
// quiet month is a few steps and not a hike.
const gapFor = (days: number) =>
  Math.min(2.5, 1.2 + 0.36 * Math.log2(1 + Math.max(0, days)));

export function planTunnel(
  films: readonly Dated[],
  aspect: number,
): TunnelPlan {
  const narrow = aspect < 0.9;
  const corridor: Corridor = narrow
    ? { ceiling: 0.86, floor: -0.6, half: 0.92 }
    : { ceiling: 0.92, floor: -0.62, half: 1.3 };
  const h = narrow ? 0.6 : 0.76;
  const w = (h * 2) / 3;
  const side = narrow ? 0.5 : 0.8;
  const yaw = narrow ? 0.34 : 0.46;

  const posters: Poster[] = [];
  const anchors: { day: number; z: number }[] = [];
  let z = 0;
  let gate = Number.NaN;
  let previous: Dated | null = null as Dated | null;

  for (const [index, film] of films.entries()) {
    if (previous) {
      const crossing =
        previous.chapter === "theatres" && film.chapter === "soon";
      if (crossing) {
        z -= Math.max(1.7, gapFor(-previous.day));
        gate = z;
        anchors.push({ day: 0, z });
        z -= Math.max(1.9, gapFor(film.day));
      } else {
        z -= gapFor(film.day - previous.day);
      }
    } else if (film.chapter === "soon") {
      // Nothing is showing: the walk opens on today.
      gate = z;
      anchors.push({ day: 0, z });
      z -= Math.max(1.9, gapFor(film.day));
    }
    const sign = index % 2 === 0 ? 1 : -1;
    posters.push({
      chapter: film.chapter,
      day: film.day,
      h,
      index,
      side: sign,
      w,
      x: sign * side,
      y: 0,
      yaw: -sign * yaw,
      z,
    });
    anchors.push({ day: film.day, z });
    previous = film;
  }

  // Everything has opened: today closes the walk.
  if (Number.isNaN(gate)) {
    if (previous) z -= Math.max(1.7, gapFor(-previous.day));
    gate = z;
    anchors.push({ day: 0, z });
  }

  const last = Math.min(gate, posters[posters.length - 1]?.z ?? gate);
  // The walk carries on past the last film, through the dark, and out
  // through the doorway.
  const portal = last - RUN_OUT;
  const end = portal - PAST_DOOR;
  return {
    anchors,
    corridor,
    end,
    gate,
    length: (START - end) / UNITS,
    portal,
    posters,
    start: START,
  };
}

// The day under a point of the corridor, read off the anchors and carried on
// at the pace of the nearest stretch beyond them.
export function dayAt(plan: TunnelPlan, z: number): number {
  const { anchors } = plan;
  if (anchors.length === 0) return 0;
  if (anchors.length === 1) return anchors[0]!.day + (anchors[0]!.z - z) * 4;
  const pace = (a: { day: number; z: number }, b: { day: number; z: number }) =>
    Math.min(3, Math.max(0.5, (b.day - a.day) / Math.max(0.001, a.z - b.z)));
  const first = anchors[0]!;
  if (z >= first.z) return first.day - (z - first.z) * pace(first, anchors[1]!);
  for (let i = 1; i < anchors.length; i += 1) {
    const a = anchors[i - 1]!;
    const b = anchors[i]!;
    if (z >= b.z) {
      const t = (a.z - z) / Math.max(0.001, a.z - b.z);
      return a.day + (b.day - a.day) * t;
    }
  }
  const tail = anchors[anchors.length - 1]!;
  const before = anchors[anchors.length - 2]!;
  return tail.day + (tail.z - z) * pace(before, tail);
}

// The inverse: where a day lies along the corridor. Days that fall on the
// same anchor collapse to its nearest end.
export function zAt(
  plan: TunnelPlan,
  day: number,
  near: number,
  far: number,
): number {
  let lo = far;
  let hi = near;
  for (let i = 0; i < 40; i += 1) {
    const mid = (lo + hi) / 2;
    if (dayAt(plan, mid) < day) hi = mid;
    else lo = mid;
  }
  return (lo + hi) / 2;
}

export interface TunnelState {
  active: number;
  camZ: number;
  // The day the camera is looking at, fractional.
  day: number;
  // Through the band and into the corridor, 0..1: the corridor's lights
  // wake as the band clears, and its words come once it has.
  through: number;
  exposure: number;
}

export function tunnelAt(s: number, plan: TunnelPlan): TunnelState {
  const camZ = Math.max(plan.end, plan.start - s * UNITS);
  let active = 0;
  let best = Infinity;
  plan.posters.forEach((poster, index) => {
    const ahead = camZ - poster.z;
    if (ahead < PAST) return;
    const off = Math.abs(ahead - FOCUS);
    if (off < best) {
      best = off;
      active = index;
    }
  });
  if (best === Infinity) active = plan.posters.length - 1;

  return {
    active,
    camZ,
    day: dayAt(plan, camZ - FOCUS * 0.85),
    through: ramp(s, 0, OVERLAP),
    exposure: 1,
  };
}
