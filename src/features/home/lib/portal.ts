// The tunnel ends in a doorway, and through it hangs the canon. The two are
// drawn by different canvases, the canon's behind the tunnel's, and the
// tunnel's is left clear in the doorway so the canon shows through it at its
// own sharpness, with any poster in front of it still in front. They talk
// through this:
//
// - the tunnel writes down how far off the doorway is and how much of the
//   screen it fills, so the canon knows when to draw and how far away to be;
// - the canon draws a small copy of itself, so the tunnel can light the
//   corridor with its colour and see it in the polished floor.

export interface Portal {
  // A small copy of the canon's screen, top row first, RGBA.
  beyond: {
    height: number;
    pixels: Uint8Array;
    version: number;
    width: number;
  };
  // The average colour of that copy, linear.
  colour: [number, number, number];
  // How far the camera still is from the doorway, in corridor units;
  // negative once it is through.
  distance: number;
  // Whether the tunnel is on screen and drawing, with its doorway clear for
  // the canon behind it. Until then the canon has no business showing.
  open: boolean;
  // The doorway on the screen, in CSS pixels: left, top, right, bottom.
  rect: [number, number, number, number];
  // 0 while the doorway is out of sight, 1 once it fills the screen.
  through: number;
}

export const portal: Portal = {
  beyond: { height: 0, pixels: new Uint8Array(0), version: 0, width: 0 },
  colour: [0, 0, 0],
  distance: Number.POSITIVE_INFINITY,
  open: false,
  rect: [0, 0, 0, 0],
  through: 0,
};

// How far behind the doorway the wall hangs. The wall grows more slowly than
// the doorway as the camera nears it, which is what makes it read as deep.
export const WALL_BEHIND = 3;
// How far the camera carries on past the doorway before the walk ends.
export const PAST_DOOR = 0.6;
// From this far down the corridor the canon keeps the tunnel's copy fresh.
export const SEEN_FROM = 60;
// The size of that copy, across.
export const COPY_WIDTH = 160;
