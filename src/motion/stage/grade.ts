const HUES = 24;
const LIGHTNESS = 0.74;
const CHROMA = 0.1;
const HEADROOM = 0.92;
const MIN_WEIGHT = 0.02;

type Tone = [number, number, number];

const toLinear = (value: number) =>
  value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
const fromLinear = (value: number) =>
  value <= 0.0031308 ? 12.92 * value : 1.055 * value ** (1 / 2.4) - 0.055;

function hueOf([r, g, b]: Tone): number {
  const [lr, lg, lb] = [r, g, b].map(toLinear);
  const l = Math.cbrt(
    0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb,
  );
  const m = Math.cbrt(
    0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb,
  );
  const s = Math.cbrt(
    0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb,
  );
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return ((Math.atan2(bb, a) * 180) / Math.PI + 360) % 360;
}

function linearOf(lightness: number, chroma: number, hue: number): Tone {
  const angle = (hue * Math.PI) / 180;
  const a = chroma * Math.cos(angle);
  const b = chroma * Math.sin(angle);
  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

function roomAt(lightness: number, hue: number): number {
  let low = 0;
  let high = 0.4;
  for (let step = 0; step < 20; step++) {
    const middle = (low + high) / 2;
    const fits = linearOf(lightness, middle, hue).every(
      (value) => value >= 0 && value <= 1,
    );
    if (fits) low = middle;
    else high = middle;
  }
  return low;
}

function toneAt(hue: number): Tone {
  const chroma = Math.min(CHROMA, HEADROOM * roomAt(LIGHTNESS, hue));
  return linearOf(LIGHTNESS, chroma, hue).map((value) =>
    Math.round(Math.min(1, Math.max(0, fromLinear(value))) * 255),
  ) as Tone;
}

export function toneOf(pixels: ArrayLike<number>): Tone | null {
  const red = new Float64Array(HUES);
  const green = new Float64Array(HUES);
  const blue = new Float64Array(HUES);
  const weight = new Float64Array(HUES);
  let total = 0;
  const count = Math.floor(pixels.length / 4);

  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i] / 255;
    const g = pixels[i + 1] / 255;
    const b = pixels[i + 2] / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;
    const lightness = (max + min) / 2;
    if (delta < 0.05 || lightness < 0.06 || lightness > 0.94) continue;
    const saturation = delta / (1 - Math.abs(2 * lightness - 1));
    const hue =
      max === r
        ? ((g - b) / delta + 6) % 6
        : max === g
          ? (b - r) / delta + 2
          : (r - g) / delta + 4;
    const slice = Math.min(HUES - 1, Math.floor((hue * 60 * HUES) / 360));
    const w = saturation * saturation * (1 - Math.abs(2 * lightness - 1));
    red[slice] += r * w;
    green[slice] += g * w;
    blue[slice] += b * w;
    weight[slice] += w;
    total += w;
  }
  if (count === 0 || total / count < MIN_WEIGHT) return null;

  let best = 0;
  let bestWeight = -1;
  for (let slice = 0; slice < HUES; slice++) {
    const sum =
      weight[(slice + HUES - 1) % HUES] +
      weight[slice] +
      weight[(slice + 1) % HUES];
    if (sum > bestWeight) {
      bestWeight = sum;
      best = slice;
    }
  }
  const near = [(best + HUES - 1) % HUES, best, (best + 1) % HUES];
  const mean = (channel: Float64Array): number =>
    near.reduce((sum, slice) => sum + channel[slice], 0) / bestWeight;
  return toneAt(hueOf([mean(red), mean(green), mean(blue)]));
}
