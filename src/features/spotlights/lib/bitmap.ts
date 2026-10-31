import { readable } from "@/motion/gl";

// Off the main thread: fetch the bytes and let the browser decode them, so a
// texture upload never stalls a frame the way an <img> decode would.
export async function loadBitmap(
  src: string,
  options: { height?: number; signal?: AbortSignal; width?: number } = {},
): Promise<ImageBitmap | null> {
  if (typeof createImageBitmap !== "function") return null;
  try {
    const response = await fetch(readable(src), {
      mode: "cors",
      signal: options.signal,
    });
    if (!response.ok) return null;
    const blob = await response.blob();
    return options.width && options.height
      ? await createImageBitmap(blob, {
          resizeHeight: options.height,
          resizeQuality: "high",
          resizeWidth: options.width,
        })
      : await createImageBitmap(blob);
  } catch {
    return null;
  }
}

/** Reads a bitmap's pixels at a given size, for sampling on the CPU. */
export function pixelsOf(
  bitmap: ImageBitmap,
  width: number,
  height: number,
): Uint8ClampedArray | null {
  const canvas = new OffscreenCanvas(width, height);
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return null;
  context.drawImage(bitmap, 0, 0, width, height);
  return context.getImageData(0, 0, width, height).data;
}
