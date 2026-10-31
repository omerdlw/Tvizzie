"use client";

import { useEffect } from "react";

const PROBE = 400;

export function useOpticalInset(
  ref: { current: HTMLElement | null },
  text: string,
  enabled = true,
) {
  useEffect(() => {
    const element = ref.current;
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!enabled || !element || !context) return;
    const origin = PROBE / 4;
    canvas.width = PROBE * 2;
    canvas.height = PROBE * 1.5;

    const fit = () => {
      const style = getComputedStyle(element);
      const first = text.trimStart().charAt(0);
      const glyph =
        style.textTransform === "uppercase" ? first.toUpperCase() : first;
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.font = `${style.fontWeight} ${PROBE}px ${style.fontFamily}`;
      context.fillStyle = "#fff";
      context.fillText(glyph, origin, PROBE * 1.1);
      const { data, width, height } = context.getImageData(
        0,
        0,
        canvas.width,
        canvas.height,
      );
      for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
          if (data[(y * width + x) * 4 + 3] > 127) {
            element.style.marginLeft = `${-(x - origin) / PROBE}em`;
            return;
          }
        }
      }
    };
    fit();
    void document.fonts.ready.then(fit);
  }, [enabled, ref, text]);
}
