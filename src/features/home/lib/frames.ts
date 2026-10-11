import { cancelFrame, frame, type FrameData } from "motion/react";
import { readable } from "@/motion/film/gl";

// The canvases draw in motion's render step. The scroll engine moves the page
// in the update step of the same frame, so a picture never trails the page it
// sits on by a frame, which is what made the sections feel loose.

export interface Frames {
  readonly running: boolean;
  start: () => void;
  stop: () => void;
}

export function frames(draw: (data: FrameData) => void): Frames {
  let running = false;
  const step = (data: FrameData) => draw(data);
  return {
    get running() {
      return running;
    },
    start() {
      if (running) return;
      running = true;
      frame.render(step, true);
    },
    stop() {
      if (!running) return;
      running = false;
      cancelFrame(step);
    },
  };
}

// Loads a picture at the size TMDB keeps it, then resamples it once, at high
// quality, to no more than the screen can show. The download is the original;
// the GPU only holds what can be seen.
export async function decodeOriginal(
  src: string,
  longest: number,
  signal: AbortSignal,
): Promise<ImageBitmap | HTMLImageElement | null> {
  const image = new Image();
  image.crossOrigin = "anonymous";
  image.decoding = "async";
  image.src = readable(src);
  try {
    await image.decode();
  } catch {
    return null;
  }
  if (signal.aborted) return null;
  const { naturalHeight: h, naturalWidth: w } = image;
  const scale = Math.min(1, longest / Math.max(w, h));
  if (scale >= 1 || typeof createImageBitmap !== "function") return image;
  try {
    const bitmap = await createImageBitmap(image, {
      resizeHeight: Math.round(h * scale),
      resizeQuality: "high",
      resizeWidth: Math.round(w * scale),
    });
    if (signal.aborted) {
      bitmap.close();
      return null;
    }
    return bitmap;
  } catch {
    return image;
  }
}

export const sizeOf = (source: ImageBitmap | HTMLImageElement) =>
  source instanceof HTMLImageElement
    ? { height: source.naturalHeight, width: source.naturalWidth }
    : { height: source.height, width: source.width };
