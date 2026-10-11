// Type for the shader is drawn once into a canvas as a soft field rather than a
// hard silhouette: the canvas shadow blurs each glyph, and the shader cuts that
// field at its midpoint. A cut through a smooth field stays a clean edge at any
// magnification, which is what lets the camera fly through a letter without
// its outline turning to mush.

export interface Box {
  h: number;
  w: number;
  x: number;
  y: number;
}

export interface WordRaster {
  canvas: HTMLCanvasElement;
  // Letter boundaries across the canvas, 0..1, one more than the letters.
  edges: number[];
  ink: Box;
  letters: Box[];
}

const PROBE = 200;
const SOFTNESS = 0.011;
// Draws the glyph far off the canvas so that only its shadow lands on it.
const AWAY = 1e5;

function context(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas unavailable");
  return { canvas, ctx };
}

function soften(ctx: CanvasRenderingContext2D, fontSize: number) {
  ctx.fillStyle = "#fff";
  ctx.shadowColor = "#fff";
  ctx.shadowBlur = Math.max(1, fontSize * SOFTNESS);
  ctx.shadowOffsetX = AWAY;
  ctx.textBaseline = "alphabetic";
}

function probe(family: string) {
  const ctx = context(1, 1).ctx;
  ctx.font = `700 ${PROBE}px ${family}`;
  return ctx;
}

export function rasterWord(
  word: string,
  family: string,
  width: number,
  tracking = 0.04,
): WordRaster {
  const measure = probe(family);
  const glyphs: {
    ascent: number;
    char: string;
    left: number;
    pen: number;
    right: number;
  }[] = [];
  let pen = 0;
  let ascent = 0;
  let descent = 0;
  for (const char of word) {
    const m = measure.measureText(char);
    glyphs.push({
      ascent: m.actualBoundingBoxAscent,
      char,
      left: pen - m.actualBoundingBoxLeft,
      pen,
      right: pen + m.actualBoundingBoxRight,
    });
    ascent = Math.max(ascent, m.actualBoundingBoxAscent);
    descent = Math.max(descent, m.actualBoundingBoxDescent);
    pen += m.width + tracking * PROBE;
  }

  const left = glyphs[0]!.left;
  const right = glyphs[glyphs.length - 1]!.right;
  const inkH = ascent + descent;
  const pad = inkH * 0.08;
  const scale = width / (right - left + pad * 2);
  const { canvas, ctx } = context(width, (inkH + pad * 2) * scale);
  const size = PROBE * scale;
  ctx.font = `700 ${size}px ${family}`;
  soften(ctx, size);

  const baseline = (pad + ascent) * scale;
  const at = (x: number) => (x - left + pad) * scale;
  for (const glyph of glyphs) {
    ctx.fillText(glyph.char, at(glyph.pen) - AWAY, baseline);
  }

  const edges = [0];
  for (let i = 1; i < glyphs.length; i += 1) {
    edges.push(at((glyphs[i - 1]!.right + glyphs[i]!.left) / 2) / canvas.width);
  }
  edges.push(1);

  return {
    canvas,
    edges,
    ink: {
      h: inkH * scale,
      w: (right - left) * scale,
      x: pad * scale,
      y: pad * scale,
    },
    letters: glyphs.map((glyph) => ({
      h: glyph.ascent * scale,
      w: (glyph.right - glyph.left) * scale,
      x: at(glyph.left),
      y: baseline - glyph.ascent * scale,
    })),
  };
}
