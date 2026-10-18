// The directors are a darkroom under its safelight: a bench along a wall,
// one large tray on the bench with a sheet of paper always in its bath, and
// a line across the wall that every director's prints hang from, five to a
// director, a little apart from the next five. The scroll draws the line
// along: each print comes up on its paper as it comes into view and fades
// back to blank as it leaves. Once all five of a director's are in view,
// their portrait comes up on the sheet, and when it is up the white light
// goes on to look at it all in its true colours; as the line moves on, the
// light goes back to amber and the sheet back to blank.
//
// The bench and the trays are seen through a lens shifted up, as an
// architect's camera is: the wall stays upright while the bench below runs
// away from the camera. The camera stands a unit above the bench and looks
// along z; a point of the bench at (x, z) is at
//   screen x = focal * x / z,  screen y = horizon - focal / z,
// in screen heights from the middle of the screen, y up. The wall, the line
// and the lamp are laid out on the screen itself, in the same measure.

export const PER_DIRECTOR = 5;
export const MAX_DIRECTORS = 10;
export const MAX_PRINTS = PER_DIRECTOR * MAX_DIRECTORS;
// The prints are kept in one texture, ten across and five down.
export const ATLAS_COLUMNS = 10;
export const ATLAS_ROWS = MAX_PRINTS / ATLAS_COLUMNS;
// A profile picture's width over its height.
export const PORTRAIT_ASPECT = 2 / 3;
// The paper round the picture on the sheet, as a share of its half size.
export const SHEET_BORDER = 0.09;

// The film the stage above last had on its screen. Its print is thrown on
// the last curtain there, and comes down into the bath here as the room
// comes up round it.
export const carried: { picture: string | null } = { picture: null };

// The last sheet, after every director's: the name of the house in its own
// letters over the line that hands the next print to whoever is looking,
// in black on white paper, so that the bath brings the letters up first.
export async function drawYours(): Promise<string | null> {
  const width = 800;
  const height = width / PORTRAIT_ASPECT;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  // The faces as the page's fonts name them on the body.
  const style = getComputedStyle(document.body);
  const face = (name: string, fallback: string) =>
    style.getPropertyValue(name).trim() || fallback;
  const word = face("--font-zuume", "sans-serif");
  const serif = face("--font-martina-serif", "serif");
  const mono = face("--font-basel-mono", "monospace");
  await Promise.all(
    [`400 100px ${word}`, `italic 400 64px ${serif}`, `400 34px ${mono}`].map(
      async (font) => {
        try {
          await document.fonts.load(font);
        } catch {
          // Drawn in whatever face there is.
        }
      },
    ),
  );

  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "#000";
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

  ctx.font = `400 34px ${mono}`;
  ctx.letterSpacing = "8px";
  ctx.fillText("NO. 11", width / 2, height * 0.2);

  // The word as wide as the paper allows.
  ctx.letterSpacing = "0px";
  ctx.font = `400 100px ${word}`;
  const size = (100 * width * 0.84) / ctx.measureText("TVIZZIE").width;
  ctx.font = `400 ${size}px ${word}`;
  ctx.fillText("TVIZZIE", width / 2, height * 0.56);

  ctx.font = `italic 400 64px ${serif}`;
  ctx.fillText("the next print", width / 2, height * 0.7);
  ctx.fillText("is yours", width / 2, height * 0.7 + 74);

  return canvas.toDataURL("image/png");
}

// The room as a page of this size lays it out.
export function roomFor(width: number, height: number): RoomLayout {
  return layoutRoom(width / height, width >= 1024 && width / height >= 1.15);
}

export interface RoomLayout {
  // Of a print's picture, its width over its height.
  aspect: number;
  // The paper either side of a print's picture.
  border: number;
  focal: number;
  // The prints of one director, side by side, and the gap after them.
  group: number;
  horizon: number;
  // The safelight on the wall: its middle and half its size.
  lamp: [number, number, number, number];
  // The line the prints hang from: its height at the middle of the screen,
  // and how much higher it is at the screen's edges.
  line: [number, number];
  // Narrow: where the list of films starts, under the bench.
  list: number;
  // From one print's middle to the next.
  pitch: number;
  // Posters hang on a narrow screen, stills on a wide one.
  posters: boolean;
  // Half a print's picture.
  print: [number, number];
  // The sheet in the middle tray, on the bench: its middle and half size.
  sheet: [number, number, number, number];
  // The middle tray: its middle and half its size. The others stand either
  // side of it, a gap apart.
  tray: [number, number, number, number];
  // How far along z the wall stands.
  wall: number;
  wide: boolean;
}

export function layoutRoom(aspect: number, wide: boolean): RoomLayout {
  const focal = wide ? 2.2 : 2.0;
  const horizon = 1.75;
  // Where the bench meets the wall, and the near and far edges of the tray,
  // which is kept clear of the dock at the foot of the screen.
  const back = wide ? 0.14 : 0.19;
  const near = wide ? -0.33 : -0.1;
  const far = wide ? 0.08 : 0.16;

  const zNear = focal / (horizon - near);
  const zFar = focal / (horizon - far);
  const z = (zNear + zFar) / 2;
  const halfZ = (zFar - zNear) / 2;
  // The sheet stands upright in the tray, a little in from its sides; the
  // tray is a little wider than the sheet.
  const sheetZ = halfZ * 0.86;
  const sheetX = sheetZ * PORTRAIT_ASPECT;
  const halfX = sheetX * 1.45;

  // A director's five prints fill most of the width, so that all of them
  // can be in view at once with room either side.
  const posters = !wide;
  const printAspect = posters ? 2 / 3 : 16 / 9;
  const span = wide ? Math.min(aspect * 0.9, 1.7) : aspect * 0.9;
  const pitch = span / (PER_DIRECTOR + 0.4);
  const group = pitch * (PER_DIRECTOR + 0.4);
  const border = pitch * (wide ? 0.05 : 0.07);
  const halfW = pitch * 0.45 - border;
  const halfH = halfW / printAspect;

  return {
    aspect: printAspect,
    border,
    focal,
    group,
    horizon,
    lamp: wide ? [0, 0.458, 0.058, 0.03] : [0, 0.5, 0.06, 0.032],
    line: [wide ? 0.36 : 0.38, wide ? 0.035 : 0.012],
    list: near - 0.035,
    pitch,
    posters,
    print: [halfW, halfH],
    sheet: [0, z + halfZ * 0.02, sheetX, sheetZ],
    tray: [0, z, halfX, halfZ],
    wall: focal / (horizon - back),
    wide,
  };
}

// Where print i hangs along the line, with the line drawn along to the
// given place: the middle of director g's prints is in the middle of the
// screen when the place is g.
export function printX(layout: RoomLayout, i: number, place: number): number {
  const g = Math.floor(i / PER_DIRECTOR);
  const j = i % PER_DIRECTOR;
  return (
    (j - (PER_DIRECTOR - 1) / 2) * layout.pitch + (g - place) * layout.group
  );
}

// The height of the line at an x.
export function lineY(layout: RoomLayout, x: number, aspect: number): number {
  const u = x / Math.max(aspect / 2, 0.01);
  return layout.line[0] + layout.line[1] * u * u;
}

// How far a print has come together, from its place on the screen: it
// gathers as it comes into the frame from the right, whole once all of it
// is in, and scatters the same way as it goes out to the left.
export function formOf(layout: RoomLayout, x: number, aspect: number): number {
  const half = layout.print[0] + layout.border;
  const coming = (aspect / 2 - (x - half)) / (half * 2);
  const going = (x + half + aspect / 2) / (half * 2);
  return Math.min(1, Math.max(0, Math.min(coming, going)));
}

// Where the line is for a share of the scroll through the directors, in
// directors from the first. Every bit of scroll moves it, but it slows as a
// director's prints come to the middle, to a fifth of its pace there, and
// gathers pace again on the way to the next.
const LINGER = 0.8;

export function placeOf(t: number, count: number): number {
  const last = Math.max(0, count - 1);
  if (t <= 0) return t;
  if (t >= last) return last;
  const k = Math.floor(t);
  const f = t - k;
  return k + f * (1 - LINGER) + f * f * (3 - 2 * f) * LINGER;
}
