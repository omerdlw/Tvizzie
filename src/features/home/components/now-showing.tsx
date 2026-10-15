"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type JSX,
  type PointerEvent,
  type RefObject,
} from "react";
import Link from "next/link";
import { cancelFrame, frame, useReducedMotion } from "motion/react";
import { movieHref } from "@config/routes";
import { tmdbImageUrl } from "@/infrastructure/tmdb/images";
import { formatWeek, rankLabel } from "../lib/format";
import type { HomeFeed, TrendingMovie } from "../lib/types";
import { Drum, Ticker } from "./odometer";

const MONO = "font-mono text-[10px] uppercase tracking-[0.24em] sm:text-[11px]";

interface NowShowingProps {
  active: number;
  films: TrendingMovie[];
  onSeek: (index: number) => void;
  plain: boolean;
  // Where the screen is through the week, in films: 2.5 is halfway from the
  // third to the fourth. The opening writes it every frame.
  position: RefObject<number>;
  week: HomeFeed["week"];
}

// Everything around the screen. It lines up with the screen's edges, which
// the opening writes into --screen-* as it lays the room out. The credits of
// the film on the screen are carried by the dock.
export function NowShowing({
  active,
  films,
  onSeek,
  plain,
  position,
  week,
}: NowShowingProps): JSX.Element {
  const film = films[active] ?? films[0]!;
  const plainSrc = plain
    ? tmdbImageUrl("backdrop", film.backdropPath, "w1280")
    : null;
  const ranks = films.map((_, index) => rankLabel(index + 1));

  return (
    <>
      {plainSrc ? (
        <img
          alt=""
          className="absolute object-cover"
          src={plainSrc}
          style={{
            bottom: "var(--screen-bottom)",
            left: "var(--screen-left)",
            right: "var(--screen-right)",
            top: "var(--screen-top)",
          }}
        />
      ) : null}

      <header
        className={`absolute flex items-center gap-4 sm:gap-6 ${MONO}`}
        style={{
          bottom:
            "calc(100% - var(--screen-top) + clamp(0.9rem, 2.4svh, 1.5rem))",
          left: "var(--screen-left)",
          right: "var(--screen-right)",
        }}
      >
        <h2 className="shrink-0 text-white/85">Trending this week</h2>
        <span className="hidden shrink-0 text-white/35 sm:inline">
          {formatWeek(week)}
        </span>
        <span aria-hidden className="relative h-px min-w-6 flex-1 bg-white/12">
          <span className="absolute inset-0 origin-left scale-x-(--progress,0) bg-white/70" />
        </span>
        <span className="flex shrink-0 items-center text-white/35 tabular-nums">
          <Drum
            align="end"
            className="-my-[0.12em] text-white/85"
            index={active}
            items={ranks}
          />
          <span className="whitespace-pre"> / </span>
          {rankLabel(films.length)}
        </span>
      </header>

      <Reel
        active={active}
        films={films}
        onSeek={onSeek}
        position={position}
      />
    </>
  );
}

// The week as a strip of one-sheets under the screen. Under a mouse the strip
// swells the way a dock does: the poster beneath the pointer grows most, its
// neighbours less, and the row spreads to make room, with the film's title
// riding on top. Every poster is on a spring of its own, so the swell follows
// the pointer, and settles back when it goes, instead of jumping between
// states. A playhead under the strip runs with the screen, poster to poster.
const SWELL = 0.36;
const REACH = 1.6;
// How far a poster rises as it swells, and the film playing besides.
const RISE = 4;
const RAISE = 5;
// How far the strip may be dimmed and drained of colour when nothing points
// at a poster.
const REST_BRIGHTNESS = 0.52;
const REST_GRAYSCALE = 0.78;

interface Spring {
  v: number;
  x: number;
}

interface Tune {
  damping: number;
  stiffness: number;
}

// Springs are named by how they feel: stiffness sets the pace, the damping
// ratio the character (1 never overshoots).
const tune = (stiffness: number, ratio: number): Tune => ({
  damping: 2 * ratio * Math.sqrt(stiffness),
  stiffness,
});
const SWELLING = tune(340, 0.74);
// Once the pointer has gone the strip breathes out, slower than it swelled.
const RELEASING = tune(130, 0.92);
const LIGHTING = tune(220, 1);
const GLIDING = tune(300, 0.86);
const PRESSING = tune(900, 0.55);
const STEP = 1 / 240;

const spring = (x = 0): Spring => ({ v: 0, x });
const pull = (s: Spring, to: number, dt: number, t: Tune) => {
  s.v += ((to - s.x) * t.stiffness - s.v * t.damping) * dt;
  s.x += s.v * dt;
};
const settle = (s: Spring, to: number) => {
  s.x = to;
  s.v = 0;
};
const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

function Reel({
  active,
  films,
  onSeek,
  position,
}: {
  active: number;
  films: TrendingMovie[];
  onSeek: (index: number) => void;
  position: RefObject<number>;
}): JSX.Element {
  const row = useRef<HTMLOListElement>(null);
  const label = useRef<HTMLDivElement>(null);
  const head = useRef<HTMLSpanElement>(null);
  // The pointer across the row, in its own pixels, while a mouse is on it.
  const aim = useRef<number | null>(null);
  const focus = useRef(-1);
  const pressed = useRef(-1);
  const playing = useRef(active);
  const reduced = Boolean(useReducedMotion());
  // The poster the title speaks for. It stays put while the title fades, so
  // the words leave with it rather than vanishing first.
  const [named, setNamed] = useState({ index: -1, way: 1 });

  useEffect(() => {
    playing.current = active;
  }, [active]);

  useEffect(() => {
    const rowEl = row.current;
    const labelEl = label.current;
    const headEl = head.current;
    if (!rowEl || !labelEl || !headEl) return;

    const items = Array.from(rowEl.children) as HTMLElement[];
    const count = items.length;
    const parts = items.map((item) => ({
      art: item.querySelector<HTMLElement>("[data-art]"),
      poster: item.querySelector<HTMLElement>("[data-poster]"),
      ring: item.querySelector<HTMLElement>("[data-ring]"),
      sheen: item.querySelector<HTMLElement>("[data-sheen]"),
    }));
    const lift = items.map(() => spring());
    const lit = items.map((_, i) => spring(i === playing.current ? 1 : 0));
    const press = items.map(() => spring());
    const shown = spring();
    const labelX = spring();
    const labelY = spring();
    const headX = spring();
    const headW = spring();

    let centres: number[] = [];
    let widths: number[] = [];
    let height = 0;
    let fresh = true;
    let visible = true;
    let lastNamed = -1;
    let owed = 0;
    let lastAt = performance.now();

    const measure = () => {
      centres = items.map((item) => item.offsetLeft + item.offsetWidth / 2);
      widths = items.map((item) => item.offsetWidth);
      height = parts[0]?.poster?.offsetHeight ?? 0;
      fresh = true;
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(rowEl);
    const seen = new IntersectionObserver(([entry]) => {
      visible = Boolean(entry?.isIntersecting);
    });
    seen.observe(rowEl);
    const release = () => {
      pressed.current = -1;
    };
    window.addEventListener("pointerup", release, { passive: true });
    window.addEventListener("pointercancel", release, { passive: true });
    window.addEventListener("blur", release);

    const shifts = new Array<number>(count).fill(0);
    const targets = new Array<number>(count).fill(0);

    const step = () => {
      const now = performance.now();
      const dt = Math.min((now - lastAt) / 1000, 1 / 20);
      lastAt = now;
      if (!visible || count === 0) return;

      const x = aim.current;
      let peak = -1;
      for (let i = 0; i < count; i++) {
        let target = 0;
        if (x !== null) {
          const d = (x - centres[i]!) / (widths[i]! * REACH);
          target = Math.exp(-d * d);
        }
        if (focus.current === i) target = Math.max(target, 1);
        targets[i] = target;
        if (target > 0.01 && (peak < 0 || target > targets[peak]!)) peak = i;
      }
      if (peak >= 0 && peak !== lastNamed) {
        const way = lastNamed < 0 ? 1 : Math.sign(peak - lastNamed);
        lastNamed = peak;
        setNamed({ index: peak, way });
      }

      const on = playing.current;
      if (reduced || fresh) {
        for (let i = 0; i < count; i++) {
          if (reduced) {
            settle(lift[i]!, targets[i]!);
            settle(lit[i]!, i === on ? 1 : 0);
          }
          settle(press[i]!, 0);
        }
        if (reduced) settle(shown, peak >= 0 ? 1 : 0);
      } else {
        const swelling = x === null && focus.current < 0 ? RELEASING : SWELLING;
        owed += dt;
        while (owed >= STEP) {
          owed -= STEP;
          for (let i = 0; i < count; i++) {
            pull(lift[i]!, targets[i]!, STEP, swelling);
            pull(lit[i]!, i === on ? 1 : 0, STEP, LIGHTING);
            pull(press[i]!, pressed.current === i ? 1 : 0, STEP, PRESSING);
          }
          pull(shown, peak >= 0 ? 1 : 0, STEP, LIGHTING);
        }
      }

      // The row spreads by what the swollen posters gained, about its middle.
      let total = 0;
      for (let i = 0; i < count; i++) {
        total += widths[i]! * SWELL * Math.max(0, lift[i]!.x);
      }
      let before = 0;
      for (let i = 0; i < count; i++) {
        const extra = widths[i]! * SWELL * Math.max(0, lift[i]!.x);
        shifts[i] = before + extra / 2 - total / 2;
        before += extra;
      }

      for (let i = 0; i < count; i++) {
        const { art, poster, ring, sheen } = parts[i]!;
        const l = lift[i]!.x;
        const o = clamp(lit[i]!.x, 0, 1);
        const light = clamp(Math.max(l, o), 0, 1);
        const scale = (1 + SWELL * Math.max(0, l)) * (1 - 0.07 * press[i]!.x);
        if (poster) {
          poster.style.transform = `translate3d(${shifts[i]!.toFixed(2)}px, ${(-(l * RISE + o * RAISE)).toFixed(2)}px, 0) scale(${scale.toFixed(4)})`;
        }
        if (art) {
          art.style.filter = `grayscale(${((1 - light) * REST_GRAYSCALE).toFixed(3)}) brightness(${mix(REST_BRIGHTNESS, 1, light).toFixed(3)})`;
        }
        if (ring) ring.style.opacity = o.toFixed(3);
        if (sheen) sheen.style.opacity = clamp(l, 0, 1).toFixed(3);
      }

      // The title rides on top of the poster it names.
      if (lastNamed >= 0) {
        const l = Math.max(0, lift[lastNamed]!.x);
        const o = clamp(lit[lastNamed]!.x, 0, 1);
        const toX = centres[lastNamed]! + shifts[lastNamed]!;
        const toY = -(height * SWELL * l + l * RISE + o * RAISE);
        if (fresh || shown.x < 0.02 || reduced) {
          settle(labelX, toX);
          settle(labelY, toY);
        } else {
          let left = dt;
          while (left > 0) {
            const h = Math.min(STEP, left);
            pull(labelX, toX, h, GLIDING);
            pull(labelY, toY, h, GLIDING);
            left -= h;
          }
        }
        const p = clamp(shown.x, 0, 1);
        labelEl.style.opacity = p.toFixed(3);
        labelEl.style.filter = `blur(${((1 - p) * 4).toFixed(2)}px)`;
        labelEl.style.transform = `translate3d(${labelX.x.toFixed(2)}px, ${(labelY.x + (1 - p) * 6).toFixed(2)}px, 0) translateX(-50%)`;
      }

      // The playhead runs between the posters as the screen does, and
      // stretches with them.
      const at = clamp(position.current ?? 0, 0, count - 1);
      const a = Math.floor(at);
      const b = Math.min(count - 1, a + 1);
      const f = at - a;
      const span = (i: number) =>
        widths[i]! * (1 + SWELL * Math.max(0, lift[i]!.x));
      const toHeadX = mix(centres[a]! + shifts[a]!, centres[b]! + shifts[b]!, f);
      const toHeadW = mix(span(a), span(b), f);
      if (fresh || reduced) {
        settle(headX, toHeadX);
        settle(headW, toHeadW);
      } else {
        let left = dt;
        while (left > 0) {
          const h = Math.min(STEP, left);
          pull(headX, toHeadX, h, GLIDING);
          pull(headW, toHeadW, h, GLIDING);
          left -= h;
        }
      }
      headEl.style.width = `${Math.max(0, headW.x).toFixed(2)}px`;
      headEl.style.transform = `translate3d(${(headX.x - headW.x / 2).toFixed(2)}px, 0, 0)`;
      fresh = false;
    };

    frame.render(step, true);
    return () => {
      cancelFrame(step);
      observer.disconnect();
      seen.disconnect();
      window.removeEventListener("pointerup", release);
      window.removeEventListener("pointercancel", release);
      window.removeEventListener("blur", release);
    };
  }, [films.length, position, reduced]);

  const point = (event: PointerEvent<HTMLOListElement>) => {
    if (event.pointerType !== "mouse") return;
    aim.current = event.clientX - event.currentTarget.getBoundingClientRect().left;
  };

  const leave = () => {
    aim.current = null;
  };

  const film = named.index >= 0 ? films[named.index] : undefined;

  return (
    <nav
      aria-label="This week's films"
      className="absolute flex justify-center"
      style={{
        left: "var(--screen-left)",
        right: "var(--screen-right)",
        top: "calc(100% - var(--screen-bottom) + clamp(1.1rem, 3svh, 2rem))",
      }}
    >
      <div className="relative">
        <div
          ref={label}
          aria-hidden
          className={`pointer-events-none absolute bottom-full left-0 mb-3 flex items-center gap-2.5 whitespace-nowrap opacity-0 [text-shadow:0_1px_12px_rgb(0_0_0/0.9)] will-change-transform ${MONO}`}
        >
          {film ? (
            <>
              <Ticker
                className="text-white/45"
                direction={named.way}
                value={rankLabel(named.index + 1)}
              />
              <Ticker
                className="text-white/90"
                direction={named.way}
                value={film.title}
              />
            </>
          ) : null}
        </div>

        <ol
          ref={row}
          className="-my-3 flex items-end gap-1.5 py-3 sm:gap-2.5"
          onPointerLeave={leave}
          onPointerMove={point}
        >
          {films.map((item, index) => {
            const on = index === active;
            const src = tmdbImageUrl("poster", item.posterPath, "w185");
            return (
              <li
                key={item.id}
                className="[--in:clamp(0,calc(var(--settle,0)*2.2-var(--i)*0.09),1)] [transform:translateY(calc((1-var(--in))*14px))] opacity-(--in)"
                style={{ "--i": index } as CSSProperties}
              >
                <button
                  data-poster
                  aria-current={on ? "true" : undefined}
                  aria-label={`No. ${index + 1}: ${item.title}`}
                  className="relative block h-11 origin-bottom overflow-hidden rounded-[3px] bg-white/5 shadow-[0_10px_24px_-12px_rgb(0_0_0/0.9)] outline-none will-change-transform focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-white/80 sm:h-[3.75rem]"
                  // The poster answers the pointer itself; a lens snapped to
                  // a box that is swelling under it would only lag behind.
                  data-cursor="idle"
                  onBlur={() => {
                    if (focus.current === index) focus.current = -1;
                  }}
                  onClick={() => onSeek(index)}
                  onFocus={(event) => {
                    if (event.currentTarget.matches(":focus-visible")) {
                      focus.current = index;
                    }
                  }}
                  onPointerDown={() => {
                    pressed.current = index;
                  }}
                  type="button"
                >
                  <span data-art className="block h-full">
                    {src ? (
                      <img
                        alt=""
                        className="aspect-[2/3] h-full object-cover"
                        decoding="async"
                        draggable={false}
                        src={src}
                      />
                    ) : (
                      <span
                        className={`grid aspect-[2/3] h-full place-items-center text-white/60 ${MONO}`}
                      >
                        {rankLabel(index + 1)}
                      </span>
                    )}
                  </span>
                  <span
                    data-sheen
                    aria-hidden
                    className="pointer-events-none absolute inset-0 bg-linear-to-t from-white/0 via-white/0 to-white/18 opacity-0 mix-blend-overlay"
                  />
                  <span
                    data-ring
                    aria-hidden
                    className={`pointer-events-none absolute inset-0 rounded-[inherit] shadow-[inset_0_0_0_1px_rgb(255_255_255/0.8)] ${
                      on ? "opacity-100" : "opacity-0"
                    }`}
                  />
                </button>
              </li>
            );
          })}
        </ol>

        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-full mt-2 block h-px bg-white/8"
        >
          <span
            ref={head}
            className="absolute top-0 left-0 block h-px bg-white/80 shadow-[0_0_8px_rgb(255_255_255/0.45)] will-change-transform"
          />
        </span>
      </div>

      <ol className="sr-only">
        {films.map((item, index) => (
          <li key={item.id}>
            <Link href={movieHref(item.id)}>
              No. {index + 1}: {item.title}
            </Link>
          </li>
        ))}
      </ol>
    </nav>
  );
}
