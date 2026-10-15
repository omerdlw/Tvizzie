import type { WordRaster } from "./glyphs";

// Where the type sits on screen, in device pixels for the shader and in CSS
// pixels for the copy that lines up with it.

export interface WordLayout {
  box: [number, number, number, number];
  focal: [number, number];
  // The ink of the word on the page, in CSS pixels.
  ink: { bottom: number; left: number; right: number; top: number };
  zoom: number;
}

export interface Rect {
  height: number;
  left: number;
  top: number;
  width: number;
}

// The camera flies into the second I.
const THROUGH = 5;
const HEIGHT_SHARE = 0.6;
const SCOPE = 2.39;

export const gutterOf = (width: number) =>
  Math.max(16, Math.round(width * 0.03));

export function layWord(
  raster: WordRaster,
  width: number,
  height: number,
  dpr: number,
): WordLayout {
  const { ink } = raster;
  const inkWidth = Math.min(
    width - gutterOf(width) * 2,
    (height * HEIGHT_SHARE * ink.w) / ink.h,
  );
  const scale = (inkWidth * dpr) / ink.w;
  const x = (width * dpr) / 2 - (ink.x + ink.w / 2) * scale;
  const y = (height * dpr) / 2 - (ink.y + ink.h / 2) * scale;
  const letter = raster.letters[THROUGH] ?? raster.letters[0]!;

  return {
    box: [x, y, raster.canvas.width * scale, raster.canvas.height * scale],
    focal: [
      x + (letter.x + letter.w / 2) * scale,
      y + (letter.y + letter.h / 2) * scale,
    ],
    ink: {
      bottom: (y + (ink.y + ink.h) * scale) / dpr,
      left: (x + ink.x * scale) / dpr,
      right: (x + (ink.x + ink.w) * scale) / dpr,
      top: (y + ink.y * scale) / dpr,
    },
    zoom:
      Math.max(
        (width * dpr) / (letter.w * scale),
        (height * dpr) / (letter.h * scale),
      ) * 1.35,
  };
}

// Kept clear beneath the screen for the reel and the dock, which carries the
// credits.
const BELOW = 236;
const BELOW_PORTRAIT = 212;

// The screen the films play on: cinemascope on a wide window, a tall frame on
// a phone, as large as the room under it allows.
export function layScreen(width: number, height: number): Rect {
  if (width < 768 && height > width) {
    const w = width - gutterOf(width) * 2;
    const top = Math.max(64, height * 0.1);
    return {
      height: Math.max(
        w * 0.75,
        Math.min(w * 1.35, height - top - BELOW_PORTRAIT),
      ),
      left: (width - w) / 2,
      top,
      width: w,
    };
  }
  const top = Math.max(72, height * 0.11);
  const w = Math.min(
    width * 0.88,
    Math.max(height * 0.4, height - top - BELOW) * SCOPE,
  );
  return {
    height: w / SCOPE,
    left: (width - w) / 2,
    top,
    width: w,
  };
}
