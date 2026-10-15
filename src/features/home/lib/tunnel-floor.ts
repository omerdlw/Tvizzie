// The corridor floor is painted like a road: a ruler of days runs along both
// walls, each month is lettered across the floor where it begins, every film
// has its date in front of it, and today is written at the threshold. The
// letters are stretched along the corridor, as road markings are, so they
// read at a glance from a few steps away.

import { dayAt, zAt, type TunnelPlan } from "./tunnel-scene";

// The paint is kept as a list of strokes rather than one picture, so the
// renderer can lay it down in strips at whatever resolution it can afford.
export interface FloorPaint {
  // Lays the strokes into a context whose origin is the near end of the
  // paint, x across the corridor, y down it, in pixels.
  draw: (ctx: CanvasRenderingContext2D) => void;
  // The stretch of corridor the paint covers.
  far: number;
  height: number;
  near: number;
  width: number;
}

export interface FloorFonts {
  display: string;
  mono: string;
}

export interface FloorFilm {
  // ISO date, or null when it has none.
  date: string | null;
  soon: boolean;
}

const MONTHS = [
  "JANUARY",
  "FEBRUARY",
  "MARCH",
  "APRIL",
  "MAY",
  "JUNE",
  "JULY",
  "AUGUST",
  "SEPTEMBER",
  "OCTOBER",
  "NOVEMBER",
  "DECEMBER",
];
const SHORT = MONTHS.map((month) => month.slice(0, 3));
const WEEKDAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const DAY_MS = 86_400_000;

const noon = (iso: string) => new Date(`${iso}T12:00:00Z`);

export function paintFloor(
  plan: TunnelPlan,
  films: readonly FloorFilm[],
  today: string,
  fonts: FloorFonts,
  // Texels the whole floor may take, and the most it is worth per metre.
  budget: number,
  limit: number,
): FloorPaint {
  const near = plan.start + 2;
  const far = plan.portal - 0.3;
  const { half } = plan.corridor;
  const span = near - far;
  const ppu = Math.max(
    64,
    Math.min(
      640,
      Math.floor(limit / (half * 2)),
      Math.floor(Math.sqrt(budget / (half * 2 * span))),
    ),
  );
  const width = Math.round(half * 2 * ppu);
  const height = Math.round(span * ppu);
  const strokes: ((ctx: CanvasRenderingContext2D) => void)[] = [];
  // Each stroke remembers the rows it touches, so a strip replays only the
  // strokes that fall on it.
  const around = (y: number, reach: number) => ({
    from: y - reach,
    to: y + reach,
  });
  const spans: { from: number; to: number }[] = [];
  const stroke = (
    range: { from: number; to: number },
    paint: (ctx: CanvasRenderingContext2D) => void,
  ) => {
    spans.push(range);
    strokes.push(paint);
  };

  const X = (x: number) => (x + half) * ppu;
  const Y = (z: number) => (near - z) * ppu;

  // Letters lie on the floor with their tops pointing down the corridor.
  const letter = (
    text: string,
    x: number,
    z: number,
    {
      align = "center",
      family,
      outline = false,
      size,
      stretch,
      tone,
      tracking = 0,
    }: {
      align?: CanvasTextAlign;
      family: string;
      outline?: boolean;
      size: number;
      stretch: number;
      tone: number;
      tracking?: number;
    },
  ) => {
    stroke(around(Y(z), size * stretch * ppu * 1.5), (ctx) => {
      ctx.save();
      ctx.translate(X(x), Y(z));
      ctx.scale(1, -stretch);
      ctx.font = `${family === fonts.display ? 700 : 400} ${size * ppu}px ${family}`;
      ctx.letterSpacing = `${tracking * size * ppu}px`;
      ctx.textAlign = align;
      ctx.textBaseline = "alphabetic";
      const shade = Math.round(255 * tone);
      if (outline) {
        ctx.strokeStyle = `rgb(${shade} ${shade} ${shade})`;
        ctx.lineWidth = Math.max(1, 0.0065 * ppu);
        ctx.strokeText(text, 0, 0);
      } else {
        ctx.fillStyle = `rgb(${shade} ${shade} ${shade})`;
        ctx.fillText(text, 0, 0);
      }
      ctx.restore();
    });
  };

  const bar = (
    x0: number,
    x1: number,
    z: number,
    depth: number,
    tone: number,
  ) => {
    const shade = Math.round(255 * tone);
    stroke(around(Y(z), depth * ppu + 2), (ctx) => {
      ctx.fillStyle = `rgb(${shade} ${shade} ${shade})`;
      ctx.fillRect(
        X(Math.min(x0, x1)),
        Y(z) - (depth * ppu) / 2,
        Math.abs(x1 - x0) * ppu,
        Math.max(1, depth * ppu),
      );
    });
  };

  // The ruler of days along both walls.
  const edge = half - 0.08;
  const spine = 0.006;
  for (const sign of [-1, 1]) {
    const shade = Math.round(255 * 0.55);
    stroke({ from: 0, to: height }, (ctx) => {
      ctx.fillStyle = `rgb(${shade} ${shade} ${shade})`;
      ctx.fillRect(X(sign * edge) - (spine * ppu) / 2, 0, spine * ppu, height);
    });
  }

  const base = noon(today);
  const first = Math.ceil(dayAt(plan, near));
  const last = Math.floor(dayAt(plan, far));
  let previousZ = Number.POSITIVE_INFINITY;
  for (let day = first; day <= last; day += 1) {
    const z = zAt(plan, day, near, far);
    // Days the calendar has pressed together share a tick.
    if (previousZ - z < 0.03) continue;
    previousZ = z;
    const date = new Date(base.getTime() + day * DAY_MS);
    const monday = date.getUTCDay() === 1;
    const opens = date.getUTCDate() === 1;
    const length = opens ? 0.3 : monday ? 0.16 : 0.07;
    for (const sign of [-1, 1]) {
      bar(
        sign * edge,
        sign * (edge - length),
        z,
        opens ? 0.012 : 0.008,
        monday || opens ? 0.7 : 0.5,
      );
    }
    if (monday || opens) {
      letter(
        String(date.getUTCDate()).padStart(2, "0"),
        -(edge - 0.2),
        z - 0.012,
        {
          align: "left",
          family: fonts.mono,
          size: 0.07,
          stretch: 2.6,
          tone: 0.55,
        },
      );
    }
    const crowded = plan.posters.some(
      (poster) => Math.abs(poster.z + 0.62 - z) < 1.5,
    );
    if (opens && !crowded && Math.abs(z - plan.gate) > 2.2) {
      letter(MONTHS[date.getUTCMonth()]!, 0, z - 0.1, {
        family: fonts.display,
        size: 0.42,
        stretch: 3.4,
        tone: 0.2,
        tracking: 0.02,
      });
    }
  }

  // Today, across the threshold.
  const weekday = WEEKDAYS[base.getUTCDay()]!;
  letter(
    `${weekday} ${base.getUTCDate()} ${SHORT[base.getUTCMonth()]}`,
    0,
    plan.gate + 0.2,
    {
      family: fonts.mono,
      size: 0.075,
      stretch: 2.6,
      tone: 0.7,
      tracking: 0.18,
    },
  );
  letter("TODAY", 0, plan.gate + 1.5, {
    family: fonts.display,
    size: 0.5,
    stretch: 3.2,
    tone: 0.62,
    tracking: 0.04,
  });

  // Each film's date at its feet: solid once it has opened, drawn in outline
  // while it is still to come.
  plan.posters.forEach((poster, index) => {
    const film = films[index];
    if (!film?.date) return;
    const date = noon(film.date);
    const label = `${SHORT[date.getUTCMonth()]} ${date.getUTCDate()}`;
    const x = poster.x - poster.side * 0.36;
    letter(label, x, poster.z + 0.62, {
      family: fonts.display,
      outline: film.soon,
      size: 0.22,
      stretch: 2.9,
      tone: film.soon ? 0.85 : 0.6,
      tracking: 0.03,
    });
  });

  const draw = (ctx: CanvasRenderingContext2D) => {
    // The strip being drawn, in paint pixels, read off the context.
    const m = ctx.getTransform();
    const from = -m.f;
    const to = from + ctx.canvas.height;
    strokes.forEach((paint, i) => {
      const range = spans[i]!;
      if (range.to >= from && range.from <= to) paint(ctx);
    });
  };

  return { draw, far, height, near, width };
}
