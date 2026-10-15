"use client";

import {
  Fragment,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type JSX,
  type KeyboardEvent,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cancelFrame, frame, useReducedMotion } from "motion/react";
import { movieHref } from "@config/routes";
import { tmdbImageUrl } from "@/infrastructure/tmdb/images";
import { readable } from "@/motion/film/gl";
import { layoutTop } from "@/motion/flow";
import { pointerSample, watchPointer } from "@/motion/film/pointer";
import { useScrollY, useSmoothScroll } from "@/motion/scroll";
import { ordinal } from "../lib/best-picture";
import {
  layoutStage,
  pull,
  turnDigits,
  type Drape,
  type StageLayout,
} from "../lib/curtain";
import { CurtainRenderer } from "../lib/curtain-renderer";
import { holdSteps } from "../lib/hold";
import type { LaureateMovie } from "../lib/types";
import { FilmDock } from "./film-dock";
import { Words } from "./words";

// Screens of scroll before the house is in place, which bring the lights up
// out of the dark the wall above went to, and after it, which take them down
// again for the darkroom to come up out of. In between the page is held: the
// films are not scrolled through but stepped through, one for each turn of
// the wheel or swipe, the curtain falling and rising on every one.
const INTRO = 1.3;
const OUTRO = 0.6;
// Of the screens after the house, those over which it goes dark.
const DARK_FROM = 0.05;
const DARK_TO = 0.5;
// The least time between two steps, so every curtain is seen to fall.
const COOLDOWN_MS = 650;
// How long the curtain stays down with the year on it before it rises.
const HOLD_MS = 260;
// Pictures fetched either side of the film in front.
const AHEAD = 2;
const GOLD = "#e4c584";
const MONO = "font-mono text-[10px] uppercase tracking-[0.24em] sm:text-[11px]";
const DECADES = [1930, 1940, 1950, 1960, 1970, 1980, 1990, 2000, 2010, 2020];

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));
const follow = (from: number, to: number, rate: number, dt: number) =>
  from + (to - from) * (1 - Math.exp(-rate * dt));
const smooth = (t: number) => t * t * (3 - 2 * t);
const ramp = (value: number, a: number, b: number) =>
  smooth(clamp((value - a) / (b - a), 0, 1));
const pad = (value: number) => String(value).padStart(3, "0");

// What goes on the screen: a still from the film where there is one, which
// fills it, or else the poster, which stands in it.
function pictureOf(film: LaureateMovie): {
  cover: boolean;
  src: string | null;
} {
  const still = tmdbImageUrl("backdrop", film.backdropPath, "w1280");
  if (still) return { cover: true, src: still };
  return { cover: false, src: tmdbImageUrl("poster", film.posterPath, "w780") };
}

function prefetch(src: string | null): void {
  if (!src) return;
  const image = new Image();
  image.crossOrigin = "anonymous";
  image.src = readable(src);
}

// The film on the screen and the one it took over from.
interface Swap {
  change: number;
  now: number;
  was: number;
}

function useSwap(index: number): Swap {
  const [swap, setSwap] = useState<Swap>({ change: 0, now: index, was: -1 });
  if (swap.now !== index) {
    setSwap({ change: swap.change + 1, now: index, was: swap.now });
  }
  return swap;
}

export function Awards({ films }: { films: LaureateMovie[] }): JSX.Element {
  const section = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const chrome = useRef<HTMLDivElement>(null);
  const copy = useRef<HTMLDivElement>(null);
  const strip = useRef<HTMLElement>(null);
  const jump = useRef<(index: number) => void>(() => {});
  // The film the page has come to, and the one the curtain has opened on.
  const [selected, setSelected] = useState(0);
  const [revealed, setRevealed] = useState(0);
  const [inside, setInside] = useState(false);
  const [wide, setWide] = useState(true);
  const [plain, setPlain] = useState(false);
  const [generation, setGeneration] = useState(0);
  const scrollY = useScrollY();
  const smoothScroll = useSmoothScroll();
  const router = useRouter();
  const reduced = Boolean(useReducedMotion());
  const swap = useSwap(revealed);
  const count = films.length;

  const decades = useMemo(
    () =>
      DECADES.flatMap((decade) => {
        const index = films.findIndex((film) => film.ceremonyYear >= decade);
        return index >= 0 ? [{ decade, index }] : [];
      }),
    [films],
  );

  useEffect(() => {
    const sectionEl = section.current;
    const stageEl = stage.current;
    const canvasEl = canvas.current;
    if (!sectionEl || !stageEl || !canvasEl || count === 0) return;

    let vw = 1;
    let vh = 1;
    let top = 0;
    let cancelled = false;
    let layout: StageLayout = layoutStage(16 / 9, true);
    let lastAt = performance.now();
    let lastInside = false;
    let lastFront = -1;
    let lastShown = -1;
    let lastHover = false;
    let index = 0;
    let steppedAt = 0;
    let closedAt = 0;
    let project = 0;
    const drape: Drape = { open: 0, speed: 0 };
    const look = { x: 0, y: 0 };
    const year = new Float32Array([1, 9, 2, 9]);

    const renderer = CurtainRenderer.create(canvasEl);
    if (!renderer) setPlain(true);

    const style = getComputedStyle(document.body);
    const display =
      style.getPropertyValue("--font-zuume").trim() || "sans-serif";
    void document.fonts
      .load(`700 100px ${display}`)
      .catch(() => undefined)
      .then(() => {
        if (!cancelled) renderer?.letter(display);
      });

    const measure = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      vw = stageEl.clientWidth;
      vh = stageEl.clientHeight;
      top = layoutTop(sectionEl);
      const isWide = vw >= 1024 && vw / vh >= 1.15;
      layout = layoutStage(vw / vh, isWide);
      setWide(isWide);
      // Where the walls and the stalls are, for the words to stand on.
      stageEl.style.setProperty(
        "--wall",
        `${Math.max(0, (vw / vh / 2 - layout.half) * vh)}px`,
      );
      stageEl.style.setProperty("--stalls", `${(0.5 - layout.front) * vh}px`);
      const width = Math.max(1, Math.round(vw * dpr));
      const height = Math.max(1, Math.round(vh * dpr));
      if (canvasEl.width !== width) canvasEl.width = width;
      if (canvasEl.height !== height) canvasEl.height = height;
    };

    // The scroll at which the house is held.
    const pin = () => top + INTRO * vh;
    const go = (to: number) => {
      const next = clamp(to, 0, count - 1);
      if (next === index) return;
      index = next;
      steppedAt = performance.now();
      setSelected(next);
      for (let k = -AHEAD; k <= AHEAD; k += 1) {
        const film = films[clamp(next + k, 0, count - 1)];
        if (film) prefetch(pictureOf(film).src);
      }
    };
    const hold = holdSteps({
      count,
      cooldown: COOLDOWN_MS,
      go,
      index: () => index,
      pin,
      reduced,
      smoothScroll,
      steppedAt: () => steppedAt,
      vh: () => vh,
    });
    jump.current = (to: number) => {
      go(to);
      if (Math.abs(window.scrollY - pin()) > 2) hold.settle();
    };

    // A point of the page in the stage's own measure: screen heights from
    // its middle, y up.
    const toStage = (x: number, y: number) => {
      const box = canvasEl.getBoundingClientRect();
      return {
        x: (x - box.left - vw / 2) / vh,
        y: (vh / 2 - (y - box.top)) / vh,
      };
    };
    const onScreen = (x: number, y: number) => {
      const at = toStage(x, y);
      const [cx, cy, hw, hh] = layout.screen;
      return (
        Math.abs(at.x + look.x * 0.008 - cx) < hw &&
        Math.abs(at.y + look.y * 0.008 - cy) < hh
      );
    };

    const click = (event: MouseEvent) => {
      if (drape.open < 0.85 || !renderer) return;
      if (!onScreen(event.clientX, event.clientY)) return;
      const film = films[renderer.shown];
      if (film) router.push(movieHref(film.id));
    };
    canvasEl.addEventListener("click", click);

    const stopPointer = watchPointer();
    const observer = new ResizeObserver(measure);
    observer.observe(stageEl);
    observer.observe(document.body);
    measure();

    const step = () => {
      const now = performance.now();
      const dt = clamp(now - lastAt, 1, 64) / 1000;
      lastAt = now;
      const y = scrollY.get();
      const raw = (y - top) / vh;
      hold.catchAt(y);
      // Past the house it goes dark, and once dark it stops drawing.
      const dark = 1 - ramp(raw, INTRO + DARK_FROM, INTRO + DARK_TO);
      const shown = raw > 0 && dark > 0;
      stageEl.style.visibility = shown ? "visible" : "hidden";
      if (!shown) {
        if (lastInside) {
          lastInside = false;
          setInside(false);
        }
        return;
      }

      // The house comes up out of the black: first the room, then the
      // footlights, then the words.
      stageEl.style.opacity = String(ramp(raw, 0.05, 0.45) * dark);
      const lit = ramp(raw, 0.2, 0.95);
      const said = ramp(raw, 0.75, 1.3) * dark;
      stageEl.style.pointerEvents = said > 0.9 ? "" : "none";
      if (chrome.current) {
        chrome.current.style.opacity = String(ramp(raw, 0.4, 0.9));
      }

      const within = lastInside ? said > 0.3 : said > 0.6;
      if (within !== lastInside) {
        lastInside = within;
        setInside(within);
      }

      const front = index;
      if (front !== lastFront) {
        lastFront = front;
        const film = films[front];
        if (film) prefetch(pictureOf(film).src);
      }
      const film = films[front]!;
      turnDigits(year, film.ceremonyYear, reduced ? 1000 : 11, dt);

      // The curtain closes whenever the page moves on, and the picture is
      // only changed behind it. Once the page is still and the new picture
      // has arrived, it is drawn again.
      const onStage = renderer ? renderer.shown : front;
      if (onStage !== front && drape.open < 0.04) {
        const picture = pictureOf(film);
        renderer?.show(front, picture.src, picture.cover);
      }
      if (drape.open < 0.04) closedAt ||= now;
      else closedAt = 0;
      const ready = (renderer ? renderer.shown : front) === front;
      const held = closedAt === 0 || now - closedAt > HOLD_MS;
      const wanted = raw > INTRO - 0.15 && ready && held ? 1 : 0;
      if (reduced) {
        drape.open = wanted;
        drape.speed = 0;
      } else {
        pull(drape, wanted, dt);
      }
      const open = clamp(drape.open, 0, 1);
      const playing = open > 0.25 && ready;
      project = follow(project, playing ? 1 : 0, playing ? 3 : 9, dt);

      if (open > 0.5 && ready && front !== lastShown) {
        lastShown = front;
        setRevealed(front);
      }
      if (copy.current) {
        const lift = ramp(open, 0.15, 0.8);
        copy.current.style.opacity = String(said * (0.28 + 0.72 * lift));
        copy.current.style.filter =
          lift > 0.98 ? "" : `blur(${((1 - lift) * 3).toFixed(2)}px)`;
      }
      if (strip.current) strip.current.style.opacity = String(said);

      const sample = pointerSample();
      const present = sample.present && !reduced && said > 0.95;
      const at = present ? toStage(sample.x, sample.y) : { x: 0, y: 0 };
      look.x = follow(look.x, clamp(at.x, -1, 1) * 1.2, 3, dt);
      look.y = follow(look.y, clamp(at.y, -0.5, 0.5) * 0.8, 3, dt);
      const hover = present && open > 0.85 && onScreen(sample.x, sample.y);
      if (hover !== lastHover) {
        lastHover = hover;
        if (hover) {
          canvasEl.dataset.cursor = "card";
          canvasEl.dataset.cursorLabel = "Open";
        } else {
          delete canvasEl.dataset.cursor;
          delete canvasEl.dataset.cursorLabel;
        }
      }

      if (!renderer || cancelled) return;
      renderer.draw({
        exposure: 0.35 + 0.65 * lit,
        grain: reduced ? 0.02 : 0.05,
        hover: hover ? 1 : 0,
        layout,
        lit,
        look,
        open: drape.open,
        project,
        swing: reduced ? 0 : drape.speed,
        time: reduced ? 0 : now / 1000,
        year,
        yearOn: (1 - ramp(open, 0.05, 0.55)) * ramp(raw, 0.45, 1.05),
      });
    };

    frame.render(step, true);
    void renderer?.lost.then(() => {
      cancelled = true;
      cancelFrame(step);
    });
    const restore = () => setGeneration((value) => value + 1);
    canvasEl.addEventListener("webglcontextrestored", restore);

    return () => {
      cancelled = true;
      cancelFrame(step);
      canvasEl.removeEventListener("click", click);
      hold.dispose();
      canvasEl.removeEventListener("webglcontextrestored", restore);
      observer.disconnect();
      stopPointer();
      renderer?.dispose();
    };
  }, [count, films, generation, reduced, router, scrollY, smoothScroll]);

  const onKey = (event: KeyboardEvent<HTMLCanvasElement>) => {
    const moves: Record<string, number> = {
      ArrowDown: 1,
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -1,
      PageDown: 10,
      PageUp: -10,
    };
    if (event.key in moves) {
      event.preventDefault();
      jump.current(clamp(selected + moves[event.key]!, 0, count - 1));
    } else if (event.key === "Home") {
      event.preventDefault();
      jump.current(0);
    } else if (event.key === "End") {
      event.preventDefault();
      jump.current(count - 1);
    } else if (event.key === "Enter" && films[revealed]) {
      router.push(movieHref(films[revealed].id));
    }
  };

  if (count === 0) return <></>;

  const current = films[swap.now] ?? films[0]!;
  const meta = [
    current.year ? `Released ${current.year}` : null,
    current.genres[0] ?? null,
  ]
    .filter(Boolean)
    .join(" · ");
  // The films before the first decade, the 1929 ceremony's, count to it.
  const decade =
    [...decades].reverse().find(({ index }) => index <= selected) ?? decades[0];

  return (
    <section
      ref={section}
      aria-labelledby="awards-title"
      className="relative"
      style={{
        height: `${(INTRO + OUTRO + 1) * 100}svh`,
        marginTop: "-100svh",
      }}
    >
      <div
        ref={stage}
        className="invisible fixed inset-0 z-0 overflow-hidden bg-black opacity-0"
      >
        <canvas
          ref={canvas}
          aria-label="A cinema stage. Every Best Picture winner is shown on its screen in turn; between them the curtain closes and the next year is thrown on it. Arrow keys move between films, Enter opens the one on screen."
          className="absolute inset-0 block size-full touch-pan-y outline-none select-none"
          onKeyDown={onKey}
          role="application"
          tabIndex={0}
        />

        {plain ? <PlainList films={films} /> : null}

        <div
          ref={chrome}
          className="pointer-events-none absolute inset-0 opacity-0"
        >
          <header className="absolute top-[clamp(1.25rem,4.5svh,2.75rem)] left-(--gutter)">
            <h2
              id="awards-title"
              className="font-martina text-[clamp(1.6rem,2.4vw,2.35rem)] leading-none font-light text-white"
            >
              Best <span className="italic">Picture</span>
            </h2>
            <p className="mt-2.5 hidden max-w-[14rem] text-[13px] leading-snug text-white/45 sm:block">
              Every film the Academy has crowned, one a scroll. The curtain
              falls on each, and rises on the next.
            </p>
          </header>

          <p
            aria-hidden
            className={`absolute top-[clamp(1.25rem,4.5svh,2.75rem)] right-(--gutter) pt-1.5 text-right tabular-nums ${MONO}`}
          >
            <span className="text-white">{pad(selected + 1)}</span>
            <span className="text-white/30"> / {pad(count)}</span>
          </p>

          {wide ? (
            <nav
              aria-label="Decades"
              className="pointer-events-auto absolute top-1/2 right-(--gutter) flex -translate-y-1/2 flex-col items-end gap-1"
            >
              {decades.map(({ decade: start, index }) => {
                const here = decade?.decade === start;
                return (
                  <button
                    key={start}
                    className={`group flex items-center gap-3 py-1 transition-colors duration-fast ${MONO} ${
                      here ? "text-white" : "text-white/30 hover:text-white/70"
                    }`}
                    onClick={() => jump.current(index)}
                    type="button"
                  >
                    {start}s
                    <span
                      aria-hidden
                      className="block h-px transition-[width,background-color] duration-slow ease-out-quint"
                      style={{
                        background: here ? GOLD : "currentColor",
                        width: here ? "2.25rem" : "0.75rem",
                      }}
                    />
                  </button>
                );
              })}
            </nav>
          ) : null}
        </div>

        <div
          className={
            wide
              ? "contents"
              : "pointer-events-none absolute inset-x-(--gutter) top-[calc(var(--stalls)+1.25rem)]"
          }
        >
          <div
            ref={copy}
            className={
              wide
                ? "pointer-events-none absolute top-1/2 left-(--gutter) w-[max(14rem,calc(var(--wall)-var(--gutter)-2.5rem))] -translate-y-1/2 opacity-0"
                : "pointer-events-none opacity-0"
            }
          >
            <p
              className={`flex items-center gap-3 ${MONO}`}
              style={{ color: GOLD }}
            >
              <span>{ordinal(current.ceremony)} Academy Awards</span>
              {wide ? null : (
                <span className="text-white/40">{current.ceremonyYear}</span>
              )}
            </p>

            {wide ? (
              <p className="mt-3 flex font-zuume text-[clamp(4.5rem,7.5vw,7.5rem)] leading-[0.84] text-[#f4efe6]">
                <Year value={current.ceremonyYear} />
              </p>
            ) : null}

            <h3 className="relative mt-3 font-martina text-[clamp(1.9rem,7.4vw,2.5rem)] leading-[1.02] font-light tracking-[-0.012em] text-balance text-[#f4efe6] lg:mt-5 lg:text-[clamp(2rem,2.7vw,3rem)]">
              <Title films={films} swap={swap} />
            </h3>

            <p className={`mt-3 text-white/45 lg:mt-4 ${MONO}`}>{meta}</p>
          </div>

          {wide ? null : (
            <nav
              ref={strip}
              aria-label="Decades"
              className="pointer-events-auto mt-7 grid grid-cols-10 gap-1 opacity-0"
            >
              {decades.map(({ decade: start, index }) => {
                const here = decade?.decade === start;
                return (
                  <button
                    key={start}
                    aria-current={here ? "true" : undefined}
                    aria-label={`${start}s`}
                    className={`flex flex-col items-center gap-2.5 pb-2 font-mono text-[10px] tracking-[0.12em] tabular-nums transition-colors duration-fast ${
                      here ? "text-white" : "text-white/35"
                    }`}
                    onClick={() => jump.current(index)}
                    type="button"
                  >
                    <span
                      aria-hidden
                      className="block w-full transition-[height,background-color] duration-slow ease-out-quint"
                      style={{
                        background: here ? GOLD : "rgb(255 255 255 / 0.18)",
                        height: here ? "2px" : "1px",
                      }}
                    />
                    <span aria-hidden>’{String(start).slice(2)}</span>
                  </button>
                );
              })}
            </nav>
          )}
        </div>

        <ol className="sr-only">
          {films.map((film) => (
            <li key={film.id}>
              <Link href={movieHref(film.id)}>
                {ordinal(film.ceremony)} Academy Awards, {film.ceremonyYear}:{" "}
                {film.title}
              </Link>
            </li>
          ))}
        </ol>
      </div>

      <FilmDock
        description={`Best Picture · ${ordinal(current.ceremony)} Academy Awards`}
        film={current}
        shown={inside}
      />
    </section>
  );
}

// The title, a word at a time out of its own line, over the last one going.
function Title({
  films,
  swap,
}: {
  films: LaureateMovie[];
  swap: Swap;
}): JSX.Element {
  return (
    <Words
      change={swap.change}
      now={films[swap.now]!.title}
      was={swap.was >= 0 ? films[swap.was]?.title : undefined}
    />
  );
}

// The year, a digit at a time: a digit that changes is carried off its line
// and the new one brought up after it.
function Year({ value }: { value: number }): JSX.Element {
  const digits = String(value).padStart(4, "0").split("");

  return (
    <span className="inline-flex tabular-nums">
      <span className="sr-only">{value}</span>
      {digits.map((digit, place) => (
        <Digit key={place} delay={place * 55} digit={digit} />
      ))}
    </span>
  );
}

function Digit({
  delay,
  digit,
}: {
  delay: number;
  digit: string;
}): JSX.Element {
  const [shown, setShown] = useState({ change: 0, now: digit, was: "" });
  if (shown.now !== digit) {
    setShown({ change: shown.change + 1, now: digit, was: shown.now });
  }
  const style = { animationDelay: `${delay}ms` } as CSSProperties;

  return (
    <span
      aria-hidden
      className="relative inline-grid w-[0.43em] justify-items-center overflow-hidden py-[0.04em]"
    >
      <span
        key={`now-${shown.change}`}
        className={`[grid-area:1/1] ${shown.change > 0 ? "home-digit-in" : ""}`}
        style={style}
      >
        {shown.now}
      </span>
      {shown.was ? (
        <span
          key={`was-${shown.change}`}
          className="home-digit-out [grid-area:1/1]"
          style={style}
        >
          {shown.was}
        </span>
      ) : null}
    </span>
  );
}

function PlainList({ films }: { films: LaureateMovie[] }): JSX.Element {
  return (
    <div className="absolute inset-0 overflow-y-auto px-(--gutter) pt-36 pb-40">
      <ol className="grid grid-cols-[repeat(auto-fill,minmax(7rem,1fr))] gap-3">
        {films.map((film) => {
          const src = tmdbImageUrl("poster", film.posterPath, "w185");
          return (
            <li key={film.id}>
              <Link className="block" href={movieHref(film.id)}>
                {src ? (
                  <img
                    alt={`${film.ceremonyYear}: ${film.title}`}
                    className="aspect-[2/3] w-full rounded-xl object-cover"
                    loading="lazy"
                    src={src}
                  />
                ) : null}
                <span className={`mt-1.5 block text-white/60 ${MONO}`}>
                  {film.ceremonyYear}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
