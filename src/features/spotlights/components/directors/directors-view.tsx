"use client";

import {
  memo,
  useCallback,
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type JSX,
  type RefObject,
} from "react";
import { useReducedMotion } from "motion/react";
import { cn } from "@omerdlw/base-framework/utils";
import { Stage, size } from "@/motion/stage";
import { imagesReady } from "@/motion/stage/ready";
import { tmdbImageSrcSet, tmdbImageUrl } from "@/infrastructure/tmdb/images";
import { DIRECTORS_HREF, movieHref, personHref } from "@/config/routes";
import { Portrait, type Box } from "../../lib/portrait/renderer";
import { MediaCard } from "@/ui";
import type { Director } from "../../lib/types";
import { useGestureStep } from "../../lib/use-gesture-step";
import { SPOTLIGHT_OPENING } from "../opening";
import { SpotlightDock } from "../spotlight-dock";

const life = (director: Director) =>
  director.died ? `${director.born}–${director.died}` : `Born ${director.born}`;

const boxOf = (element: Element): Box => {
  const box = element.getBoundingClientRect();
  return { height: box.height, width: box.width, x: box.left, y: box.top };
};

const GAP = 8;
const MAX_TILE = 92;
// Kept clear above and below the shelf, so it sits level with the names.
const AIR = 96;

// The opening act, in order: the filmography sweeps in on a diagonal
// at full light, its colour pours up into the face and the posters dim
// behind it, and once the face reads the directors' names come down the
// list. A change is its own, quicker move: the shelf fades out while the
// face crumbles to dust, and the next shelf fades in as the next face
// condenses out of it.
type Act = "wait" | "print" | "pour" | "rest" | "leave" | "arrive" | "enter";

const PRINT_WINDOW_S = size(3);
const PRINT_STEP_S = 0.18;
const PRINT_S = size(2);
const DRAIN_S = size(3);
const LEAVE_S = size(0);
const ENTER_S = size(2);
const LOAD_PATIENCE_S = size(3);
const SWAP_PATIENCE_S = size(0);
const SWARM_PATIENCE_S = size(5);
const NAMES_PATIENCE_S = size(5);

// The print is one wave front at 45°, top-left to bottom-right, moving at
// a steady speed: each poster starts the moment the front reaches its
// corner, so no two share a start and the sweep never pulses. A short shelf
// sweeps quicker; none takes longer than the window.
const diagonals = (count: number, columns: number) =>
  Math.max(1, Math.ceil(count / columns) + columns - 2);
const sweepOf = (count: number, columns: number) =>
  Math.min(PRINT_WINDOW_S, diagonals(count, columns) * PRINT_STEP_S);

/** Where the front reaches each poster, 0 to 1 across the sweep. */
function wavePlaces(count: number, columns: number, tile: number) {
  const across = tile + GAP;
  const down = tile * 1.5 + GAP;
  const reach = (i: number) =>
    (i % columns) * across + Math.floor(i / columns) * down;
  const far = Math.max(1, reach(count - 1), reach(columns - 1));
  return Array.from({ length: count }, (_, i) => reach(i) / far);
}

const wait = (seconds: number) =>
  new Promise<void>((done) => setTimeout(done, seconds * 1000));

// Loaded is not enough: a poster that decodes mid-print stutters the act.
async function decoded(element: HTMLElement | null, patience: number) {
  if (!element) return;
  const posters = async () => {
    await imagesReady(element);
    await Promise.all(
      Array.from(element.querySelectorAll("img"), (image) =>
        image.decode().catch(() => undefined),
      ),
    );
  };
  await Promise.race([posters(), wait(patience)]);
}

interface Fit {
  columns: number;
  tile: number;
}

// The largest posters that still fit the whole filmography in the column
// without scrolling: the portrait pours out of every one of them.
function fitGrid(width: number, height: number, count: number): Fit {
  let best: Fit = { columns: count, tile: 1 };
  for (let columns = 1; columns <= count; columns += 1) {
    const rows = Math.ceil(count / columns);
    const across = (width - GAP * (columns - 1)) / columns;
    const down = (height - GAP * (rows - 1)) / rows / 1.5;
    const tile = Math.floor(Math.min(MAX_TILE, across, down));
    if (tile > best.tile) best = { columns, tile };
  }
  return best;
}

const sameFit = (a: Fit | null, b: Fit) =>
  a?.columns === b.columns && a.tile === b.tile;

const POSTER_WIDTHS = ["w92", "w185"] as const;

// Kept apart so a change of act re-renders the shelf, not every poster.
const Filmography = memo(function Filmography({
  director,
  fit,
  list,
  onScroll,
}: {
  director: Director;
  fit: Fit | null;
  list: RefObject<HTMLOListElement | null>;
  onScroll: () => void;
}): JSX.Element {
  const tile = fit?.tile ?? 56;
  // A soft corner, scaled down with the poster.
  const radius = Math.max(4, Math.round(tile / 12));
  const columns = Math.max(1, fit?.columns ?? director.films.length);
  const places = wavePlaces(director.films.length, columns, tile);
  return (
    <ol
      className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] lg:mx-0 lg:grid lg:overflow-visible lg:px-0"
      onScroll={onScroll}
      ref={list}
      style={
        {
          "--sweep": `${sweepOf(director.films.length, columns)}s`,
          gridTemplateColumns: fit
            ? `repeat(${fit.columns}, ${fit.tile}px)`
            : undefined,
        } as CSSProperties
      }
    >
      {director.films.map((film, i) => {
        const title = film.year ? `${film.title} (${film.year})` : film.title;
        return (
          <li
            className="directors-print w-12 shrink-0 sm:w-14 lg:w-auto"
            key={film.id}
            style={
              {
                "--at": places[i]!.toFixed(4),
              } as CSSProperties
            }
          >
            <MediaCard
              frameClassName="directors-frame"
              href={movieHref(film.id)}
              image={{
                sizes: `${tile}px`,
                src: tmdbImageUrl("poster", film.posterPath, "w185"),
                srcSet:
                  tmdbImageSrcSet("poster", film.posterPath, POSTER_WIDTHS) ??
                  undefined,
              }}
              label={title}
              radius={radius}
              tooltip={title}
            />
          </li>
        );
      })}
    </ol>
  );
});

export function DirectorsView({
  directors,
  initial,
}: {
  directors: Director[];
  initial: number;
}): JSX.Element {
  const reduced = Boolean(useReducedMotion());
  const canvas = useRef<HTMLCanvasElement>(null);
  const face = useRef<HTMLDivElement>(null);
  const shelf = useRef<HTMLElement>(null);
  const list = useRef<HTMLOListElement>(null);
  const portrait = useRef<Portrait | null>(null);
  const [index, setIndex] = useState(initial);
  // The director whose posters are on the shelf; it trails `index` by the
  // length of a change.
  const [grid, setGrid] = useState(initial);
  const [act, setAct] = useState<Act>("wait");
  // Whose posters are decoded, and whose swarm the canvas has drawn once:
  // the act holds in the dark until both, so no first upload or decode
  // lands in the middle of it.
  const [loaded, setLoaded] = useState<number | null>(null);
  const [drawn, setDrawn] = useState<number | null>(null);
  const [named, setNamed] = useState(false);
  const [fit, setFit] = useState<Fit | null>(null);
  const [failed, setFailed] = useState(false);
  const director = directors[index]!;
  const showing = directors[grid]!;
  const count = showing.films.length;

  const pick = (next: number) => {
    const to = (next + directors.length) % directors.length;
    setIndex(to);
    if (to !== grid) {
      setAct("leave");
    } else if (act === "leave") {
      // Called back before the face had gone: it gathers again.
      portrait.current?.pour(grid);
      setAct("enter");
    }
  };
  useGestureStep((direction) => pick(index + direction));

  const swapped = useEffectEvent((to: number) => {
    setDrawn(to);
    if (to === grid) return;
    setGrid(to);
    setAct("arrive");
    portrait.current?.pour(to);
  });
  const formed = useEffectEvent((at: number) => {
    if (at === grid) setNamed(true);
  });
  const release = useEffectEvent(() => {
    if (index !== grid) return;
    portrait.current?.pour(grid);
    setAct("pour");
  });

  const place = useCallback(() => {
    const scene = portrait.current;
    if (!scene || !face.current) return;
    const posters = Array.from(
      list.current?.querySelectorAll(".directors-frame") ?? [],
      boxOf,
    );
    if (posters.length > 0) scene.place(boxOf(face.current), posters);
  }, []);

  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    const columns = matchMedia("(min-width: 768px)").matches ? 200 : 120;
    const scene = Portrait.create(element, directors, columns, {
      formed: (at) => formed(at),
      swapped: (to) => swapped(to),
    });
    if (!scene) {
      setFailed(true);
      return;
    }
    portrait.current = scene;
    place();
    const observer = new ResizeObserver(place);
    observer.observe(element);
    if (face.current) observer.observe(face.current);
    return () => {
      observer.disconnect();
      scene.dispose();
      portrait.current = null;
    };
  }, [directors, place]);

  // Posters come on only once they are ready to draw, or once waiting
  // would show: at the opening they print, after a change they fade in.
  useEffect(() => {
    if (act !== "wait" && act !== "arrive") return;
    let live = true;
    const patience = act === "wait" ? LOAD_PATIENCE_S : SWAP_PATIENCE_S;
    void decoded(list.current, patience).then(() => {
      if (live) setLoaded(grid);
    });
    return () => {
      live = false;
    };
  }, [act, grid]);

  // A swarm that never arrives must not keep the page dark.
  useEffect(() => {
    if (act !== "wait") return;
    const timer = setTimeout(() => setDrawn(grid), SWARM_PATIENCE_S * 1000);
    return () => clearTimeout(timer);
  }, [act, grid]);

  useEffect(() => {
    if (loaded !== grid) return;
    if (act === "wait" && (drawn === grid || failed)) setAct("print");
    if (act === "arrive") setAct("enter");
  }, [act, drawn, failed, grid, loaded]);

  useEffect(() => {
    const after = (seconds: number, next: () => void) => {
      const timer = setTimeout(next, reduced ? 0 : seconds * 1000);
      return () => clearTimeout(timer);
    };
    if (act === "print") {
      const sweep = sweepOf(count, Math.max(1, fit?.columns ?? count));
      const printed = sweep + PRINT_S * 0.6;
      return after(printed, release);
    }
    if (act === "pour") return after(DRAIN_S, () => setAct("rest"));
    if (act === "enter") return after(ENTER_S, () => setAct("rest"));
  }, [act, count, fit, reduced]);

  // Without a portrait to wait on, or should it stall, the names still come.
  useEffect(() => {
    if (failed) {
      setNamed(true);
      return;
    }
    const timer = setTimeout(() => setNamed(true), NAMES_PATIENCE_S * 1000);
    return () => clearTimeout(timer);
  }, [failed]);

  useLayoutEffect(() => {
    const element = shelf.current;
    if (!element) return;
    const measure = () => {
      const next = fitGrid(
        element.clientWidth,
        element.clientHeight - AIR,
        Math.max(1, count),
      );
      setFit((fit) => (sameFit(fit, next) ? fit : next));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [count]);

  useEffect(() => portrait.current?.setReduced(reduced), [reduced]);
  useLayoutEffect(place, [place, grid, fit]);

  useEffect(() => {
    portrait.current?.show(index);
    const timer = setTimeout(() => {
      const url = new URL(window.location.href);
      url.searchParams.set("director", String(directors[index]!.id));
      window.history.replaceState(window.history.state, "", url);
    }, 500);
    return () => clearTimeout(timer);
  }, [directors, index]);

  return (
    <Stage
      className="directors-page relative h-dvh overflow-hidden"
      opening={SPOTLIGHT_OPENING}
      black
    >
      <SpotlightDock
        action={{ icon: "solar:user-rounded-bold", label: "Open profile" }}
        description={[life(director), director.place]
          .filter(Boolean)
          .join(" · ")}
        href={personHref(director.id)}
        icon={tmdbImageUrl("profile", director.profilePath, "w185")!}
        path={DIRECTORS_HREF}
        title={director.name}
      />
      <canvas
        aria-hidden="true"
        className="fixed inset-0 h-full w-full"
        ref={canvas}
      />
      <h1 className="sr-only">
        Twenty great directors, each drawn in the colours of their films
      </h1>

      <div
        className="relative z-10 mx-auto grid h-dvh w-full max-w-[100rem] grid-cols-1 grid-rows-[auto_minmax(0,1fr)_auto] gap-x-12 px-4 pt-5 pb-[calc(var(--dock-h,6rem)+0.75rem)] sm:px-8 sm:pt-8 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:grid-rows-1 lg:pb-[calc(var(--dock-h,6rem)+1.5rem)]"
        data-act={act}
        style={
          {
            "--drain": `${DRAIN_S}s`,
            "--enter": `${ENTER_S}s`,
            "--leave": `${LEAVE_S}s`,
            "--print": `${PRINT_S}s`,
          } as CSSProperties
        }
      >
        <nav
          aria-label="Directors"
          className="flex min-w-0 lg:order-3 lg:items-center lg:justify-end"
          data-named={named ? "" : undefined}
        >
          <ol className="-mx-4 flex gap-1 overflow-x-auto px-4 [scrollbar-width:none] lg:mx-0 lg:flex-col lg:items-end lg:gap-0 lg:overflow-visible lg:px-0">
            {directors.map((entry, i) => {
              const on = i === index;
              return (
                <li
                  className="directors-name shrink-0"
                  key={entry.id}
                  style={{ "--i": i } as CSSProperties}
                >
                  <button
                    aria-current={on ? "true" : undefined}
                    className={cn(
                      "cine-fade py-1.5 pr-3 text-[13px] font-medium whitespace-nowrap lg:py-1 lg:pr-0",
                      on ? "text-white" : "text-white/30 hover:text-white/70",
                    )}
                    onClick={() => pick(i)}
                    type="button"
                  >
                    {entry.name}
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        <div className="flex min-h-0 items-center justify-center py-4 lg:order-2 lg:py-0">
          <div
            aria-label={`Portrait of ${director.name}`}
            className="relative aspect-[2/3] h-[min(100%,84dvh)] max-w-full"
            ref={face}
            role="img"
          >
            {failed ? (
              <img
                alt=""
                className="absolute inset-0 h-full w-full object-cover grayscale"
                src={tmdbImageUrl("profile", director.profilePath, "h632")!}
              />
            ) : null}
          </div>
        </div>

        <aside
          aria-label={`Films by ${showing.name}`}
          className="flex min-h-0 min-w-0 flex-col lg:order-1 lg:justify-center"
          ref={shelf}
        >
          <Filmography
            director={showing}
            fit={fit}
            key={showing.id}
            list={list}
            onScroll={place}
          />
        </aside>
      </div>
    </Stage>
  );
}
