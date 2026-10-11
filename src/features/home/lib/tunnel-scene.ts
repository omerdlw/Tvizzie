// The tunnel is a corridor through time, laid along -z. The films in
// theatres hang on its walls first, then the camera passes a ring of light
// that is today, and the films still to open follow in the order they open.
// Units are tunnel radii; the camera rides the axis.

export type Chapter = "theatres" | "soon";

export interface Poster {
  chapter: Chapter;
  // Index into its own chapter's list.
  index: number;
  h: number;
  w: number;
  x: number;
  y: number;
  yaw: number;
  z: number;
}

export interface TunnelPlan {
  end: number;
  gate: number;
  // In screens of scroll.
  length: number;
  posters: Poster[];
  start: number;
}

const SPACING = 1.65;
const GATE_GAP = 2.4;
const START = 3.2;
const PAST = 0.9;
// Tunnel units travelled per screen of scroll.
export const UNITS = 3;
const INTRO = 0.35;
const OUTRO = 0.7;
const FOCUS = 2.8;

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const smooth = (t: number) => t * t * (3 - 2 * t);
const ramp = (value: number, a: number, b: number) =>
  smooth(clamp01((value - a) / (b - a)));

export function planTunnel(
  theatres: number,
  soon: number,
  aspect: number,
): TunnelPlan {
  const narrow = aspect < 0.9;
  const h = narrow ? 0.56 : 0.7;
  const w = (h * 2) / 3;
  const side = narrow ? Math.max(0.22, aspect * 0.42) : 0.6;
  const posters: Poster[] = [];
  let z = 0;

  const place = (chapter: Chapter, index: number) => {
    const sign = posters.length % 2 === 0 ? 1 : -1;
    posters.push({
      chapter,
      h,
      index,
      w,
      x: sign * side,
      y: narrow ? sign * 0.12 : -0.04 + (index % 3) * 0.03,
      yaw: -sign * (narrow ? 0.2 : 0.34),
      z,
    });
  };

  for (let i = 0; i < theatres; i += 1) {
    place("theatres", i);
    z -= SPACING;
  }
  const gate = theatres > 0 ? z + SPACING - GATE_GAP : 0;
  z = gate - GATE_GAP * 0.8;
  for (let i = 0; i < soon; i += 1) {
    place("soon", i);
    z -= SPACING;
  }

  const last = posters[posters.length - 1]?.z ?? gate;
  const end = last + PAST - FOCUS * 0.4;
  return {
    end,
    gate,
    length: INTRO + (START - end) / UNITS + OUTRO,
    posters,
    start: START,
  };
}

export interface TunnelState {
  active: number;
  camZ: number;
  exposure: number;
  // How far the camera has come through each chapter, 0..1.
  soon: number;
  theatres: number;
}

export function tunnelAt(s: number, plan: TunnelPlan): TunnelState {
  const travel = Math.max(0, s - INTRO) * UNITS;
  const camZ = Math.max(plan.end, plan.start - travel);
  const exposure =
    ramp(s, 0, INTRO + 0.25) * (1 - ramp(s, plan.length - OUTRO, plan.length));

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

  const firstZ = plan.posters[0]?.z ?? 0;
  return {
    active,
    camZ,
    exposure,
    soon: clamp01((plan.gate - camZ) / Math.max(0.001, plan.gate - plan.end)),
    theatres: clamp01(
      (plan.start - camZ) /
        Math.max(0.001, plan.start - Math.min(firstZ, plan.gate)),
    ),
  };
}
