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
// The day numbers on the ruler: their size, how far they stand out from the
// wall, clear of the longest tick, and the floor one takes up along the
// corridor, with a clear stretch either side of it.
const NUMBER_SIZE = 0.07;
const NUMBER_STRETCH = 2.6;
const NUMBER_COLUMN = 0.38;
const NUMBER_CAP = NUMBER_SIZE * NUMBER_STRETCH * 0.7;
const NUMBER_ROOM = NUMBER_CAP * 2.2;
// A film's date at its feet, and the floor kept clear round it.
const DATE_SIZE = 0.22;
const DATE_STRETCH = 2.9;
const DATE_TRACKING = 0.03;
const DATE_CAP = DATE_SIZE * DATE_STRETCH * 0.7;
const MONTH_SIZE = 0.42;
const MONTH_STRETCH = 3.4;
const MONTH_TRACKING = 0.02;
const CLEAR = 0.06;
// Across the corridor a number keeps further from other type, so that the
// two are not read as one line.
const ASIDE = 0.35;

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
  // The days that may be numbered on the ruler: the first of each month and
  // every Monday.
  const marked: { day: string; first: boolean; z: number }[] = [];
  // The months lettered across the floor.
  const months: { label: string; z: number }[] = [];
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
      marked.push({
        day: String(date.getUTCDate()).padStart(2, "0"),
        first: opens,
        z,
      });
    }
    const crowded = plan.posters.some(
      (poster) => Math.abs(poster.z + 0.62 - z) < 1.5,
    );
    if (opens && !crowded && Math.abs(z - plan.gate) > 2.2) {
      const month = { label: MONTHS[date.getUTCMonth()]!, z: z - 0.1 };
      months.push(month);
      letter(month.label, 0, month.z, {
        family: fonts.display,
        size: MONTH_SIZE,
        stretch: MONTH_STRETCH,
        tone: 0.2,
        tracking: MONTH_TRACKING,
      });
    }
  }

  // How wide a line of type lies across the floor.
  const gauge = document.createElement("canvas").getContext("2d");
  const widthOf = (
    text: string,
    family: string,
    size: number,
    tracking = 0,
  ) => {
    if (!gauge) return text.length * size * 0.6;
    gauge.font = `${family === fonts.display ? 700 : 400} ${size * ppu}px ${family}`;
    gauge.letterSpacing = `${tracking * size * ppu}px`;
    return gauge.measureText(text).width / ppu;
  };

  // Each film's date, at its feet.
  const dates = plan.posters.flatMap((poster, index) => {
    const film = films[index];
    if (!film?.date) return [];
    const date = noon(film.date);
    return [
      {
        label: `${SHORT[date.getUTCMonth()]} ${date.getUTCDate()}`,
        soon: film.soon,
        x: poster.x - poster.side * 0.36,
        z: poster.z + 0.62,
      },
    ];
  });

  // Where the calendar presses days together their numbers would print over
  // each other, so only those with clear floor either side are kept, the
  // firsts of the months before the Mondays; and none where a film's date
  // reaches over the column.
  const column = -(edge - NUMBER_COLUMN);
  const reach = column + widthOf("00", fonts.mono, NUMBER_SIZE) + ASIDE;
  const taken = [
    ...dates
      .filter(
        ({ label, x }) =>
          x - widthOf(label, fonts.display, DATE_SIZE, DATE_TRACKING) / 2 <
          reach,
      )
      .map(({ z }) => ({ from: z - DATE_CAP - CLEAR, to: z + CLEAR })),
    ...months
      .filter(
        ({ label }) =>
          -widthOf(label, fonts.display, MONTH_SIZE, MONTH_TRACKING) / 2 <
          reach,
      )
      .map(({ z }) => ({
        from: z - MONTH_SIZE * MONTH_STRETCH * 0.7 - CLEAR,
        to: z + CLEAR,
      })),
  ];
  const numbers: typeof marked = [];
  const fits = (z: number) =>
    numbers.every((kept) => Math.abs(kept.z - z) >= NUMBER_ROOM) &&
    taken.every(
      ({ from, to }) => z + NUMBER_CAP / 2 < from || z - NUMBER_CAP / 2 > to,
    );
  for (const first of [true, false]) {
    for (const mark of marked) {
      if (mark.first === first && fits(mark.z)) numbers.push(mark);
    }
  }
  // Each stands in one column clear of the ticks, level with its own.
  numbers.forEach(({ day, z }) => {
    letter(day, column, z + NUMBER_CAP / 2, {
      align: "left",
      family: fonts.mono,
      size: NUMBER_SIZE,
      stretch: NUMBER_STRETCH,
      tone: 0.55,
    });
  });

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
  dates.forEach(({ label, soon, x, z }) => {
    letter(label, x, z, {
      family: fonts.display,
      outline: soon,
      size: DATE_SIZE,
      stretch: DATE_STRETCH,
      tone: soon ? 0.85 : 0.6,
      tracking: DATE_TRACKING,
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
