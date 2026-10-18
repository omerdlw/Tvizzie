// The awards are a picture palace seen from the stalls: a proscenium hung
// with a velvet curtain, a screen behind it, footlights along the front of
// the stage and the backs of the seats in front of the camera. Everything is
// laid out on the screen itself, in screen heights from its middle with y
// up, so what the page measures here is what the shader draws.

export interface StageLayout {
  // The front of the apron: below it is the pit and then the stalls.
  front: number;
  // Half the width of the opening.
  half: number;
  // The screen behind the curtain: its middle and half its size.
  screen: [number, number, number, number];
  // Where the tops of the nearest seats are.
  seats: number;
  // The line the curtain's hem sweeps.
  stage: number;
  // The top of the opening, under the frame.
  top: number;
  // Wide: the words stand on the walls either side of the stage. Otherwise
  // the stage takes the top of the screen and the words sit under it.
  wide: boolean;
  // Where the year is thrown on the closed curtain: its middle and height.
  year: [number, number, number];
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

// How much of the opening a drawn curtain leaves clear, from the middle.
export const DRAWN = 0.84;
// How far down the frame's swagged border hangs into the opening.
export const VALANCE = 0.1;
const SCREEN_ASPECT = 16 / 9;

export function layoutStage(aspect: number, wide: boolean): StageLayout {
  const across = aspect / 2;
  const half = wide
    ? clamp(across * 0.58, 0.3, 0.64)
    : Math.max(0.05, across - 0.018);
  const top = wide ? 0.36 : 0.37;
  const stage = wide ? -0.2 : -0.05;
  const front = wide ? -0.27 : -0.1;
  const seats = wide ? -0.37 : -0.43;

  // The screen fits the part of the opening a drawn curtain leaves, under
  // the border and above the stage.
  const high = top - VALANCE - 0.035;
  const low = stage + 0.05;
  let halfH = (high - low) / 2;
  let halfW = halfH * SCREEN_ASPECT;
  const room = half * DRAWN * 0.9;
  if (halfW > room) {
    halfW = room;
    halfH = halfW / SCREEN_ASPECT;
  }
  const middle = (high + low) / 2;

  return {
    front,
    half,
    screen: [0, middle, halfW, halfH],
    seats,
    stage,
    top,
    wide,
    year: [0, middle + 0.005, Math.min(halfH * 1.15, half * 0.62)],
  };
}

// The stage as a page of this size lays it out.
export function stageFor(width: number, height: number): StageLayout {
  return layoutStage(width / height, width >= 1024 && width / height >= 1.15);
}

// The curtain is heavy: it is drawn by a spring that lets it overshoot a
// little and sway before it hangs still, and it closes faster than it opens.
export interface Drape {
  open: number;
  speed: number;
}

export function pull(drape: Drape, target: number, dt: number): void {
  const stiffness = target > drape.open ? 22 : 60;
  const damping = 2 * Math.sqrt(stiffness) * 0.72;
  drape.speed +=
    ((target - drape.open) * stiffness - drape.speed * damping) * dt;
  drape.open = clamp(drape.open + drape.speed * dt, -0.03, 1.04);
}

// Four digit drums, each turning the short way round to its place.
export function turnDigits(
  digits: Float32Array,
  year: number,
  rate: number,
  dt: number,
): void {
  const wanted = String(Math.max(0, Math.round(year)))
    .padStart(4, "0")
    .slice(-4);
  for (let i = 0; i < 4; i += 1) {
    const to = Number(wanted[i]);
    const from = digits[i]!;
    const away = ((((to - from) % 10) + 15) % 10) - 5;
    // The digits further right turn first, as a counter's would.
    const k = 1 - Math.exp(-rate * (0.7 + 0.1 * i) * dt);
    let next = from + away * k;
    if (Math.abs(to - next) < 0.002 || Math.abs(away) < 0.002) next = to;
    digits[i] = ((next % 10) + 10) % 10;
  }
}

// The wall above was the picture on this screen all along. Its section
// over, the camera is found close in on the screen, so close the screen is
// all of the frame, and pulls back out of it: the house comes round it, the
// seats rise into the foot of the frame, and the curtain closes over the
// wall. Both sides work it out from the scroll, here, so they never part.
// In screens of scroll past the end of the wall.
export const PULL_BACK = {
  // The camera pulls back over this stretch, and the wall is cropped down
  // to the screen's edges over the first part of it.
  crop: 0.35,
  from: 0,
  to: 0.6,
  // The curtain closes over the wall.
  close: [0.5, 0.8],
} as const;

export interface PullBack {
  // How much of the wall's own frame has been cropped to the screen, 0..1.
  crop: number;
  // The camera on the stage, as the dolly the stage is drawn with.
  dolly: number;
  // How far the camera stood in, at the start.
  near: number;
  // How far the curtain is drawn while it closes over the wall.
  open: number;
}

const smoothstep = (t: number) => t * t * (3 - 2 * t);
const span = (value: number, a: number, b: number) =>
  smoothstep(clamp((value - a) / (b - a), 0, 1));

export function pullBackAt(
  past: number,
  layout: StageLayout,
  aspect: number,
): PullBack {
  const near = nearOf(layout, aspect);
  const back = span(past, PULL_BACK.from, PULL_BACK.to);
  return {
    crop: span(past, PULL_BACK.from, PULL_BACK.crop),
    dolly: Math.exp(Math.log(near) * (1 - back)),
    near,
    open: 1 - span(past, PULL_BACK.close[0], PULL_BACK.close[1]),
  };
}

// The nearest the camera can stand with the wall, laid over the whole
// frame, still covering the screen.
function nearOf(layout: StageLayout, aspect: number): number {
  const [, cy, hw, hh] = layout.screen;
  return Math.max(1, Math.min(aspect / (2 * hw), (0.5 - Math.abs(cy)) / hh));
}

// Where the wall's canvas goes, a frame of the full page laid over the
// stage: a scale about a point of the page, and the part of it left
// showing, as insets from its own edges, all in CSS pixels.
export interface WallOnStage {
  clip: [number, number, number, number];
  origin: [number, number];
  scale: number;
}

export function wallOnStage(
  pull: PullBack,
  layout: StageLayout,
  width: number,
  height: number,
): WallOnStage {
  const aspect = width / height;
  const [, cy, hw, hh] = layout.screen;
  const { near } = pull;
  // The wall's frame on the stage: at the start it is the whole frame.
  const left = -aspect / (2 * near);
  const top = cy - cy / near + 1 / (2 * near);
  const x = (sx: number) => ((sx - left) * near * width) / aspect;
  const y = (sy: number) => (top - sy) * near * height;
  // The screen, and of it what the curtain leaves.
  const lead = Math.min(hw, pull.open * layout.half * DRAWN);
  const insets: [number, number, number, number] = [
    y(cy + hh),
    width - x(lead),
    height - y(cy - hh),
    x(-lead),
  ];
  return {
    // The crop is done before the curtain moves.
    clip: insets.map((inset) => Math.max(0, inset) * pull.crop) as [
      number,
      number,
      number,
      number,
    ],
    origin: [width / 2, height / 2 - cy * height],
    scale: pull.dolly / near,
  };
}
