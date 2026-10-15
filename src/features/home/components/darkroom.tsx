"use client";

import {
  useEffect,
  useRef,
  useState,
  type JSX,
  type KeyboardEvent,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cancelFrame, frame, useReducedMotion } from "motion/react";
import { movieHref, personHref } from "@config/routes";
import { tmdbImageUrl } from "@/infrastructure/tmdb/images";
import { readable } from "@/motion/film/gl";
import { layoutTop } from "@/motion/flow";
import { pointerSample, watchPointer } from "@/motion/film/pointer";
import { useScrollY, useSmoothScroll } from "@/motion/scroll";
import {
  formOf,
  layoutRoom,
  lineY,
  MAX_PRINTS,
  PER_DIRECTOR,
  placeOf,
  printX,
  type RoomLayout,
} from "../lib/darkroom";
import { DarkroomRenderer } from "../lib/darkroom-renderer";
import type { Director } from "../lib/types";
import { DirectorDock, FilmDock } from "./film-dock";
import { Words } from "./words";

// Screens of scroll that bring the safelight up out of the dark the stage
// above went to and carry the first director's prints in; then a stretch
// of scroll from each director to the next; then a rest on the last before
// the page ends. Nothing is held: the line is drawn along with the scroll.
const INTRO = 1.2;
const STRETCH = 0.9;
const END = 0.5;
// How long a sheet takes to come up, once it is in the bath.
const DEVELOP_S = 3;
// How long the wave takes across the bath when the sheet changes.
const WAVE_MS = 1100;
const MONO = "font-mono text-[10px] uppercase tracking-[0.24em] sm:text-[11px]";

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));
const follow = (from: number, to: number, rate: number, dt: number) =>
  from + (to - from) * (1 - Math.exp(-rate * dt));
const smooth = (t: number) => t * t * (3 - 2 * t);
const ramp = (value: number, a: number, b: number) =>
  smooth(clamp((value - a) / (b - a), 0, 1));
const pad = (value: number) => String(value).padStart(2, "0");
const touchOnly = () => window.matchMedia("(hover: none)").matches;

function lifeOf(director: Director): string {
  return director.died
    ? `${director.born}–${director.died}`
    : `Born ${director.born}`;
}

function pictureOf(
  director: Director | undefined,
  j: number,
  posters: boolean,
): string | null {
  const film = director?.films[j];
  if (!film) return null;
  return posters
    ? tmdbImageUrl("poster", film.posterPath, "w342")
    : (tmdbImageUrl("backdrop", film.backdropPath, "w780") ??
        tmdbImageUrl("poster", film.posterPath, "w342"));
}

function portraitOf(director: Director | undefined): string | null {
  return tmdbImageUrl("profile", director?.profilePath, "h632");
}

function prefetch(src: string | null): void {
  if (!src) return;
  const image = new Image();
  image.crossOrigin = "anonymous";
  image.src = readable(src);
}

// The director in front and the one before.
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

export function Darkroom({
  directors,
}: {
  directors: Director[];
}): JSX.Element {
  const section = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const jump = useRef<(index: number) => void>(() => {});
  // The film pointed at in the list, and on a touch screen the print
  // tapped, each as a place along the whole line.
  const listed = useRef(-1);
  const tapped = useRef(-1);
  const [front, setFront] = useState(0);
  const [inside, setInside] = useState(false);
  const [wide, setWide] = useState(true);
  const [hovered, setHovered] = useState(-1);
  const [tap, setTap] = useState(-1);
  const [plain, setPlain] = useState(false);
  const [generation, setGeneration] = useState(0);
  const scrollY = useScrollY();
  const smoothScroll = useSmoothScroll();
  const router = useRouter();
  const reduced = Boolean(useReducedMotion());
  const swap = useSwap(front);
  const count = Math.min(directors.length, MAX_PRINTS / PER_DIRECTOR);
  // A print tapped belongs to the director it was tapped under.
  const picked = Math.floor(tap / PER_DIRECTOR) === front ? tap : -1;

  useEffect(() => {
    listed.current = hovered >= 0 ? front * PER_DIRECTOR + hovered : -1;
    tapped.current = picked;
  }, [front, hovered, picked]);

  useEffect(() => {
    const sectionEl = section.current;
    const stageEl = stage.current;
    const canvasEl = canvas.current;
    if (!sectionEl || !stageEl || !canvasEl || count === 0) return;

    let vw = 1;
    let vh = 1;
    let top = 0;
    let cancelled = false;
    let layout: RoomLayout = layoutRoom(16 / 9, true);
    let lastAt = performance.now();
    let lastInside = false;
    let lastFront = -1;
    let lastPlace = Number.NaN;
    let lastShown = "";
    let lastHover = -1;
    let waveAt = -WAVE_MS;
    let develop = 0;
    let wasDevelop = 0;
    let swing = 0;
    let inspectAt = -1;
    let inspectUp = 0;
    let pointed = -1;
    let framed = -1;
    const prints = count * PER_DIRECTOR;
    const form = new Float32Array(MAX_PRINTS);

    const renderer = DarkroomRenderer.create(canvasEl);
    if (!renderer) setPlain(true);

    const measure = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      vw = stageEl.clientWidth;
      vh = stageEl.clientHeight;
      top = layoutTop(sectionEl);
      const isWide = vw >= 1024 && vw / vh >= 1.15;
      layout = layoutRoom(vw / vh, isWide);
      setWide(isWide);
      stageEl.style.setProperty("--list", `${(0.5 - layout.list) * vh}px`);
      const width = Math.max(1, Math.round(vw * dpr));
      const height = Math.max(1, Math.round(vh * dpr));
      if (canvasEl.width !== width) canvasEl.width = width;
      if (canvasEl.height !== height) canvasEl.height = height;
    };

    // Where the line is for a scroll: before the first director's prints
    // are in, it is drawn in from off the right of the screen.
    const placeAt = (raw: number) => {
      if (raw < INTRO) {
        const away =
          (vw / vh / 2 + layout.group / 2 + layout.pitch) / layout.group;
        const k = clamp((raw - 0.2) / (INTRO - 0.2), 0, 1);
        return -away * Math.pow(1 - k, 3);
      }
      return placeOf((raw - INTRO) / STRETCH, count);
    };
    // Brings a director's prints to rest in the middle.
    jump.current = (k: number) => {
      const y = top + (INTRO + clamp(k, 0, count - 1) * STRETCH) * vh;
      if (reduced) window.scrollTo({ top: y, behavior: "instant" });
      else if (smoothScroll) smoothScroll.scrollTo(y, { duration: 0.9 });
      else window.scrollTo({ top: y, behavior: "smooth" });
    };

    // The whole print under a point of the page, if there is one.
    const printAt = (clientX: number, clientY: number, place: number) => {
      const box = canvasEl.getBoundingClientRect();
      const x = (clientX - box.left - vw / 2) / vh;
      const y = (vh / 2 - (clientY - box.top)) / vh;
      const halfW = layout.print[0] + layout.border;
      const tall = (layout.print[1] + layout.border) * 2 + 0.003;
      for (let i = 0; i < prints; i += 1) {
        if ((form[i] ?? 0) < 0.999) continue;
        const px = printX(layout, i, place);
        if (Math.abs(x - px) > halfW) continue;
        const pin = lineY(layout, px, vw / vh) - 0.004;
        if (y <= pin && y >= pin - tall) return i;
      }
      return -1;
    };
    const filmAt = (i: number) =>
      directors[Math.floor(i / PER_DIRECTOR)]?.films[i % PER_DIRECTOR];

    const click = (event: MouseEvent) => {
      const at = touchOnly()
        ? printAt(event.clientX, event.clientY, lastPlace)
        : pointed;
      const film = at >= 0 ? filmAt(at) : undefined;
      if (!film) return;
      // On a touch screen the first tap on a print looks at it, under the
      // inspection lamp and on the card; the second opens it.
      if (touchOnly() && tapped.current !== at) {
        setTap(at);
        return;
      }
      router.push(movieHref(film.id));
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
      const raw = (scrollY.get() - top) / vh;
      const shown = raw > 0;
      stageEl.style.visibility = shown ? "visible" : "hidden";
      if (!shown) {
        if (lastInside) {
          lastInside = false;
          setInside(false);
        }
        return;
      }

      // The room comes up out of the black: first the lamp and the wall,
      // then the bench, then the list.
      stageEl.style.opacity = String(ramp(raw, 0.05, 0.4));
      const lit = ramp(raw, 0.12, 0.8);
      const said = ramp(raw, 0.6, INTRO);
      stageEl.style.pointerEvents = said > 0.9 ? "" : "none";
      const within = lastInside ? said > 0.3 : said > 0.6;
      if (within !== lastInside) {
        lastInside = within;
        setInside(within);
      }

      const place = placeAt(raw);
      const speed = Number.isNaN(lastPlace) ? 0 : (place - lastPlace) / dt;
      lastPlace = place;
      swing = reduced ? 0 : follow(swing, clamp(speed * 0.5, -1, 1), 6, dt);
      const near = clamp(Math.round(place), 0, count - 1);
      if (near !== lastFront) {
        lastFront = near;
        setFront(near);
        prefetch(portraitOf(directors[near]));
        prefetch(portraitOf(directors[near + 1]));
      }

      // The pictures for the prints of every director up to two past the
      // one in front are asked for; the rest wait.
      if (renderer) {
        const upto = Math.min(prints, (near + 3) * PER_DIRECTOR);
        renderer.prints(
          Array.from({ length: upto }, (_, i) =>
            pictureOf(
              directors[Math.floor(i / PER_DIRECTOR)],
              i % PER_DIRECTOR,
              layout.posters,
            ),
          ),
          layout.posters,
        );
      }

      // Each print comes together as it comes into view, once its picture
      // has come. A director is in frame once all of theirs are whole and
      // the line is at rest on them.
      const aspect = vw / vh;
      for (let i = 0; i < prints; i += 1) {
        const ready = renderer ? renderer.ready(i, now) : 1;
        form[i] = filmAt(i)
          ? formOf(layout, printX(layout, i, place), aspect) * ready
          : 0;
      }
      // A director comes into frame once all their prints are whole, and
      // stays in it until the line has drawn them well on, so that a little
      // scroll either way does not take the sheet out of the bath.
      if (framed >= 0 && Math.abs(place - framed) > 0.22) framed = -1;
      const k = Math.round(place);
      if (framed < 0 && k >= 0 && k < count && Math.abs(place - k) < 0.08) {
        let whole = true;
        for (let j = 0; j < PER_DIRECTOR; j += 1) {
          const i = k * PER_DIRECTOR + j;
          if (filmAt(i) && (form[i] ?? 0) < 0.999) whole = false;
        }
        if (whole) framed = k;
      }

      // The sheet is in the bath while a director is in frame and out of
      // it otherwise. Each change rocks the bath; a new sheet comes up.
      const key = framed >= 0 ? `d${framed}` : "none";
      renderer?.sheet(key, framed >= 0 ? portraitOf(directors[framed]) : null);
      const onShow = renderer ? renderer.shown : key;
      if (onShow !== lastShown) {
        lastShown = onShow;
        wasDevelop = develop;
        develop = reduced && onShow !== "none" ? 1 : 0;
        waveAt = now;
      }
      if (onShow === key && key !== "none" && !reduced) {
        develop = Math.min(1, develop + dt / DEVELOP_S);
      }
      const wave = reduced ? 1 : smooth(clamp((now - waveAt) / WAVE_MS, 0, 1));

      // What is under the pointer, and the inspection lamp over whichever
      // print is being looked at.
      const sample = pointerSample();
      pointed =
        sample.present && said > 0.9 ? printAt(sample.x, sample.y, place) : -1;
      if (pointed !== lastHover) {
        lastHover = pointed;
        if (pointed >= 0) {
          canvasEl.dataset.cursor = "card";
          canvasEl.dataset.cursorLabel = "Open";
        } else {
          delete canvasEl.dataset.cursor;
          delete canvasEl.dataset.cursorLabel;
        }
      }
      let looked = -1;
      if (said > 0.9) {
        looked = listed.current;
        if (looked < 0) looked = pointed;
        if (looked < 0) looked = tapped.current;
      }
      if (looked >= 0 && looked !== inspectAt) {
        inspectAt = looked;
        inspectUp = 0;
      }
      const lamp = looked >= 0 ? 1 : 0;
      inspectUp = follow(inspectUp, lamp, lamp ? 7 : 4, dt);

      if (list.current) list.current.style.opacity = String(said);

      if (!renderer || cancelled) return;
      renderer.draw({
        develop,
        exposure: 0.4 + 0.6 * lit,
        form,
        grain: reduced ? 0.02 : 0.055,
        inspect: [inspectAt, inspectUp],
        layout,
        lit,
        place,
        prints,
        swing,
        time: reduced ? 0 : now / 1000,
        wasDevelop,
        wave,
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
      canvasEl.removeEventListener("webglcontextrestored", restore);
      observer.disconnect();
      stopPointer();
      renderer?.dispose();
    };
  }, [count, directors, generation, reduced, router, scrollY, smoothScroll]);

  const onKey = (event: KeyboardEvent<HTMLCanvasElement>) => {
    const moves: Record<string, number> = {
      ArrowDown: 1,
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -1,
    };
    if (moves[event.key] !== undefined) {
      event.preventDefault();
      jump.current(front + moves[event.key]!);
    } else if (event.key === "Home") {
      event.preventDefault();
      jump.current(0);
    } else if (event.key === "End") {
      event.preventDefault();
      jump.current(count - 1);
    } else if (event.key === "Enter" && directors[front]) {
      router.push(personHref(directors[front].id));
    }
  };

  if (count === 0) return <></>;

  const current = directors[swap.now] ?? directors[0]!;
  const was = swap.was >= 0 ? directors[swap.was] : undefined;
  const tappedFilm =
    picked >= 0 ? current.films[picked % PER_DIRECTOR] : undefined;

  return (
    <section
      ref={section}
      aria-label="The ten most successful directors"
      className="relative"
      style={{
        height: `${(INTRO + (count - 1) * STRETCH + END + 1) * 100}svh`,
        marginTop: "-100svh",
      }}
    >
      <div
        ref={stage}
        className="invisible fixed inset-0 z-0 overflow-hidden bg-black opacity-0"
      >
        <canvas
          ref={canvas}
          aria-label="A darkroom under an amber safelight. Five films by each of the ten most successful directors hang on a line that the scroll draws along; each print gathers out of dust as it comes into view, and while a director's five are in view their portrait comes up in the tray. Arrow keys move between directors, Enter opens the one in the tray."
          className="absolute inset-0 block size-full touch-pan-y outline-none select-none"
          onKeyDown={onKey}
          role="application"
          tabIndex={0}
        />

        {plain ? <PlainList directors={directors} /> : null}

        <div
          aria-hidden
          className={
            wide
              ? "pointer-events-none absolute bottom-0 left-0 h-[70svh] w-[46vw] bg-[radial-gradient(ellipse_at_0%_100%,rgb(0_0_0/0.85),rgb(0_0_0/0.5)_45%,transparent_72%)]"
              : "pointer-events-none absolute inset-x-0 bottom-0 h-[46svh] bg-linear-to-t from-black via-black/75 to-transparent"
          }
        />

        <div
          ref={list}
          className={
            wide
              ? "absolute bottom-[max(9rem,17svh)] left-(--gutter) w-[min(24rem,28vw)] opacity-0"
              : "absolute inset-x-(--gutter) top-(--list) opacity-0"
          }
        >
          <ol className="flex flex-col border-t border-white/10">
            {current.films.map((film, i) => {
              const lit = hovered === i || picked % PER_DIRECTOR === i;
              return (
                <li key={i} className="border-b border-white/10">
                  <Link
                    className={`flex items-baseline gap-4 transition-colors duration-fast ${
                      wide ? "py-2.5" : "py-1.5"
                    } ${lit ? "text-white" : "text-white/60"}`}
                    href={movieHref(film.id)}
                    onBlur={() => setHovered(-1)}
                    onFocus={() => setHovered(i)}
                    onPointerEnter={(event) => {
                      if (event.pointerType === "mouse") setHovered(i);
                    }}
                    onPointerLeave={() => setHovered(-1)}
                  >
                    <span className={`w-5 text-white/30 tabular-nums ${MONO}`}>
                      {pad(i + 1)}
                    </span>
                    <span
                      className={`relative min-w-0 flex-1 truncate ${
                        wide ? "text-[15px]" : "text-[13px]"
                      }`}
                    >
                      <Words
                        change={swap.change}
                        now={film.title}
                        was={was?.films[i]?.title}
                      />
                    </span>
                    <span className={`text-white/35 tabular-nums ${MONO}`}>
                      {film.year}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
        </div>

        <ol className="sr-only">
          {directors.map((director) => (
            <li key={director.id}>
              <Link href={personHref(director.id)}>
                {director.rank}. {director.name}
              </Link>
              <ol>
                {director.films.map((film) => (
                  <li key={film.id}>
                    <Link href={movieHref(film.id)}>
                      {film.title} ({film.year})
                    </Link>
                  </li>
                ))}
              </ol>
            </li>
          ))}
        </ol>
      </div>

      <DirectorDock
        description={`No. ${current.rank} · ${lifeOf(current)}`}
        director={current}
        shown={inside && !tappedFilm}
      />
      {tappedFilm ? (
        <FilmDock
          description={`${current.name} · ${tappedFilm.year}`}
          film={tappedFilm}
          shown={inside}
        />
      ) : null}
    </section>
  );
}

function PlainList({ directors }: { directors: Director[] }): JSX.Element {
  return (
    <div className="absolute inset-0 overflow-y-auto px-(--gutter) pt-36 pb-40">
      <ol className="flex flex-col gap-10">
        {directors.map((director) => (
          <li key={director.id}>
            <Link
              className="font-martina text-2xl text-white"
              href={personHref(director.id)}
            >
              {director.rank}. {director.name}
            </Link>
            <ol className="mt-3 grid grid-cols-[repeat(auto-fill,minmax(7rem,1fr))] gap-3">
              {director.films.map((film) => {
                const src = tmdbImageUrl("poster", film.posterPath, "w185");
                return (
                  <li key={film.id}>
                    <Link className="block" href={movieHref(film.id)}>
                      {src ? (
                        <img
                          alt={`${film.title} (${film.year})`}
                          className="aspect-[2/3] w-full rounded-xl object-cover"
                          loading="lazy"
                          src={src}
                        />
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ol>
          </li>
        ))}
      </ol>
    </div>
  );
}
