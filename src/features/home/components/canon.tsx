"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type JSX,
  type KeyboardEvent,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cancelFrame, frame, useReducedMotion } from "motion/react";
import {
  useDockActionClass,
  useDockActions,
} from "@omerdlw/base-framework/modules/dock";
import { useToast } from "@omerdlw/base-framework/modules/notification";
import { report, toUserMessage } from "@omerdlw/base-framework/utils";
import { movieHref } from "@config/routes";
import {
  applyMovieLibraryChange,
  type MovieLibraryKind,
} from "@/features/account/lib/library";
import {
  getLibraryMarksAction,
  setMovieLibraryAction,
} from "@/features/account/server/library-actions";
import { createSignInSurfaceEntry, useAuth } from "@/features/auth";
import { tmdbImageUrl } from "@/infrastructure/tmdb/images";
import { layoutTop } from "@/motion/flow";
import { pointerSample, watchPointer } from "@/motion/film/pointer";
import { useScrollY } from "@/motion/scroll";
import { Button, Icon } from "@/ui";
import { CanonRenderer, type CanonFilmState } from "../lib/canon-renderer";
import {
  COLUMNS,
  filmAt,
  nearestCopy,
  wallAt,
  type Vec2,
  type WallView,
} from "../lib/canon-wall";
import { rankLabel } from "../lib/format";
import {
  COPY_WIDTH,
  PAST_DOOR,
  SEEN_FROM,
  WALL_BEHIND,
  portal,
} from "../lib/portal";
import type { CanonMovie } from "../lib/types";
import { FilmDock } from "./film-dock";
import { Count, Ticker } from "./odometer";

// Screens of scroll the wall holds for, and how far it drifts up per screen.
const LENGTH = 2.6;
// Screens past its end after which the awards stage has faded in over it, and
// the wall stops drawing and gives up the dock. It goes dark on the way.
const GIVEN_UP = 0.5;
const ROWS_PER_SCREEN = 0.9;
// Below this many pixels a press is a pick, not a drag.
const CLICK_SLOP = 6;
const MONO = "font-mono text-[10px] uppercase tracking-[0.24em] sm:text-[11px]";

type Filter = "all" | "seen" | "unseen";

const FILTERS: readonly { label: string; value: Filter }[] = [
  { label: "All", value: "all" },
  { label: "Seen", value: "seen" },
  { label: "To watch", value: "unseen" },
];

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));
const follow = (from: number, to: number, rate: number, dt: number) =>
  from + (to - from) * (1 - Math.exp(-rate * dt));
const smooth = (t: number) => t * t * (3 - 2 * t);
const ramp = (value: number, a: number, b: number) =>
  smooth(clamp((value - a) / (b - a), 0, 1));

interface Marks {
  account: string | null;
  listed: ReadonlySet<number>;
  watched: ReadonlySet<number>;
}

const NONE: ReadonlySet<number> = new Set();

// What the frame loop needs of the latest render.
interface Live {
  filter: Filter;
  known: boolean;
  listed: ReadonlySet<number>;
  selected: number;
  watched: ReadonlySet<number>;
}

export function Canon({ films }: { films: CanonMovie[] }): JSX.Element {
  const section = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const chrome = useRef<HTMLDivElement>(null);
  const cue = useRef<(index: number) => void>(() => {});
  const live = useRef<Live>({
    filter: "all",
    known: false,
    listed: NONE,
    selected: 0,
    watched: NONE,
  });
  const [selected, setSelected] = useState(0);
  const [hovered, setHovered] = useState(-1);
  const [filter, setFilter] = useState<Filter>("all");
  const [inside, setInside] = useState(false);
  const [plain, setPlain] = useState(false);
  const [generation, setGeneration] = useState(0);
  const [marks, setMarks] = useState<Marks>({
    account: null,
    listed: NONE,
    watched: NONE,
  });
  const [pending, setPending] = useState(false);
  const scrollY = useScrollY();
  const router = useRouter();
  const reduced = Boolean(useReducedMotion());
  const auth = useAuth();
  const toast = useToast();
  const { openSurface } = useDockActions();

  const account = auth.isAuthenticated ? (auth.user?.id ?? null) : null;
  const known = account !== null && marks.account === account;
  const watched = known ? marks.watched : NONE;
  const listed = known ? marks.listed : NONE;
  const ids = useMemo(() => films.map((film) => film.id), [films]);
  const seenCount = useMemo(
    () => films.filter((film) => watched.has(film.id)).length,
    [films, watched],
  );

  useEffect(() => {
    live.current = { filter, known, listed, selected, watched };
  }, [filter, known, listed, selected, watched]);

  useEffect(() => {
    if (!account) return;
    let cancelled = false;
    getLibraryMarksAction(ids)
      .then((result) => {
        if (cancelled) return;
        if (!result.success) {
          report("Canon marks", result.error);
          return;
        }
        setMarks({
          account,
          listed: new Set(result.watchlist),
          watched: new Set(result.watched),
        });
      })
      .catch((error) => report("Canon marks", error));
    return () => {
      cancelled = true;
    };
  }, [account, ids]);

  const signIn = useCallback(() => {
    void openSurface(
      createSignInSurfaceEntry({ next: window.location.pathname }),
    );
  }, [openSurface]);

  const toggle = useCallback(
    async (
      film: CanonMovie,
      kind: Extract<MovieLibraryKind, "watched" | "watchlist">,
    ) => {
      if (!auth.isReady || pending) return;
      if (!account) {
        signIn();
        return;
      }
      const before = marks;
      const state = {
        liked: false,
        watched: watched.has(film.id),
        watchlist: listed.has(film.id),
      };
      const apply = (next: typeof state) => {
        const nextWatched = new Set(watched);
        const nextListed = new Set(listed);
        if (next.watched) nextWatched.add(film.id);
        else nextWatched.delete(film.id);
        if (next.watchlist) nextListed.add(film.id);
        else nextListed.delete(film.id);
        setMarks({ account, listed: nextListed, watched: nextWatched });
      };
      apply(applyMovieLibraryChange(state, kind, !state[kind]));
      setPending(true);
      try {
        const result = await setMovieLibraryAction(film.id, kind, !state[kind]);
        if (result.success) apply(result.state);
        else {
          setMarks(before);
          toast(result.error);
        }
      } catch (error) {
        report("Canon toggle", error);
        setMarks(before);
        toast(
          toUserMessage(error, { fallback: "Could not update your library" }),
        );
      } finally {
        setPending(false);
      }
    },
    [account, auth.isReady, listed, marks, pending, signIn, toast, watched],
  );

  useEffect(() => {
    const sectionEl = section.current;
    const stageEl = stage.current;
    const canvasEl = canvas.current;
    if (!sectionEl || !stageEl || !canvasEl || films.length === 0) return;

    let dpr = 1;
    let vw = 1;
    let vh = 1;
    let top = 0;
    let basePitch = 1;
    let cancelled = false;
    let lastAt = performance.now();
    let lastHover = -1;
    let lastInside = false;
    let copied = 0;
    const count = films.length;
    const offset: Vec2 = [0, 0];
    const velocity: Vec2 = [0, 0];
    let glide: Vec2 | null = null;
    let drag: {
      id: number;
      lastAt: number;
      lastX: number;
      lastY: number;
      moved: number;
      view: WallView;
    } | null = null;
    const focus: Vec2 = [0, 0];
    const lamp: Vec2 = [0, 0];
    let lens = 0.3;
    let view: WallView | null = null;
    const looks: CanonFilmState[] = films.map(() => ({
      listed: false,
      lift: 0,
      match: 1,
      seen: 0,
    }));
    // Seen through the doorway, No. 1 hangs in the middle of it.
    const home: Vec2 = [0.5, 0.5];

    const renderer = CanonRenderer.create(
      canvasEl,
      films.map((film) => tmdbImageUrl("poster", film.posterPath, "w342")),
      Math.max(window.innerWidth, window.innerHeight) < 900,
    );
    if (!renderer) setPlain(true);

    const measure = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      vw = stageEl.clientWidth;
      vh = stageEl.clientHeight;
      top = layoutTop(sectionEl);
      const width = Math.max(1, Math.round(vw * dpr));
      const height = Math.max(1, Math.round(vh * dpr));
      if (canvasEl.width !== width) canvasEl.width = width;
      if (canvasEl.height !== height) canvasEl.height = height;
      basePitch = vh * (vw / vh < 0.9 ? 0.15 : 0.2);
    };

    const centre = (v: WallView): Vec2 => wallAt(v, vw / 2, vh / 2);

    // Brings a film to the middle of the screen, the short way round.
    cue.current = (index: number) => {
      if (!view) return;
      const at = centre(view);
      const to = nearestCopy(index, at, count);
      velocity[0] = 0;
      velocity[1] = 0;
      glide = [offset[0] + to[0] - at[0], offset[1] + to[1] - at[1]];
      if (reduced) {
        offset[0] = glide[0];
        offset[1] = glide[1];
        glide = null;
      }
    };

    const down = (event: PointerEvent) => {
      if (event.button !== 0 || !view) return;
      drag = {
        id: event.pointerId,
        lastAt: performance.now(),
        lastX: event.clientX,
        lastY: event.clientY,
        moved: 0,
        view: { ...view },
      };
      glide = null;
      velocity[0] = 0;
      velocity[1] = 0;
    };
    const move = (event: PointerEvent) => {
      if (!drag || event.pointerId !== drag.id) return;
      const box = canvasEl.getBoundingClientRect();
      const from = wallAt(
        drag.view,
        drag.lastX - box.left,
        drag.lastY - box.top,
      );
      const to = wallAt(
        drag.view,
        event.clientX - box.left,
        event.clientY - box.top,
      );
      const dx = to[0] - from[0];
      const dy = to[1] - from[1];
      const now = performance.now();
      const dt = Math.max(1, now - drag.lastAt) / 1000;
      offset[0] -= dx;
      offset[1] -= dy;
      velocity[0] = follow(velocity[0], -dx / dt, 18, dt);
      velocity[1] = follow(velocity[1], -dy / dt, 18, dt);
      drag.moved += Math.hypot(
        event.clientX - drag.lastX,
        event.clientY - drag.lastY,
      );
      drag.lastX = event.clientX;
      drag.lastY = event.clientY;
      drag.lastAt = now;
      if (drag.moved > CLICK_SLOP) canvasEl.dataset.cursor = "drag";
    };
    const up = (event: PointerEvent) => {
      if (!drag || event.pointerId !== drag.id) return;
      const picked = drag.moved <= CLICK_SLOP;
      // A drag that stopped before letting go does not fling.
      if (picked || performance.now() - drag.lastAt > 90) {
        velocity[0] = 0;
        velocity[1] = 0;
      }
      drag = null;
      delete canvasEl.dataset.cursor;
      lastHover = -2;
      if (!picked || !view) return;
      const box = canvasEl.getBoundingClientRect();
      const index = filmAt(
        wallAt(view, event.clientX - box.left, event.clientY - box.top),
        count,
      );
      if (index < 0) return;
      // A pick stays where it is, so a second click lands on the same film
      // and opens it.
      if (index === live.current.selected) {
        router.push(movieHref(films[index]!.id));
        return;
      }
      live.current = { ...live.current, selected: index };
      setSelected(index);
    };
    const cancel = (event: PointerEvent) => {
      if (drag?.id === event.pointerId) drag = null;
    };

    canvasEl.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", cancel);
    const stopPointer = watchPointer();
    const observer = new ResizeObserver(measure);
    observer.observe(stageEl);
    observer.observe(document.body);
    // The prints are fetched once the wall is a couple of screens away, so
    // they do not hold up the sections above it.
    const near = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        renderer?.start();
        near.disconnect();
      },
      // Early enough to have the top of the chart in by the time the
      // doorway at the end of the tunnel comes into sight.
      { rootMargin: "500% 0px" },
    );
    near.observe(sectionEl);
    measure();

    const step = () => {
      const now = performance.now();
      const dt = clamp(now - lastAt, 1, 64) / 1000;
      lastAt = now;
      const raw = (scrollY.get() - top) / vh;
      const s = Number.isFinite(raw) ? clamp(raw, 0, LENGTH) : 0;
      // The wall is first seen through the doorway at the end of the
      // tunnel, and has the whole screen once the camera is through it.
      const gone = raw > LENGTH + GIVEN_UP;
      const beyond = raw > 0 && !gone;
      const entered = gone ? 0 : beyond ? 1 : portal.through;
      // From far down the corridor the wall shows through the doorway,
      // dimmed by the haze between; the tunnel's canvas sits over it, clear
      // only in the doorway.
      const copying =
        !beyond &&
        portal.open &&
        portal.distance < SEEN_FROM &&
        portal.distance > -PAST_DOOR + 0.05;
      // At its end the wall goes dark, for the awards to come up out of.
      const dark = 1 - ramp(raw, LENGTH - 0.25, LENGTH + GIVEN_UP);
      const exposure = beyond
        ? dark
        : copying
          ? Math.exp(-Math.max(portal.distance, 0) * 0.05)
          : 0;
      // Hung some way behind the doorway, the wall grows more slowly than it.
      const distance = beyond
        ? -PAST_DOOR
        : Math.max(portal.distance, -PAST_DOOR);
      const zoom = (WALL_BEHIND - PAST_DOOR) / (distance + WALL_BEHIND);

      const shown = beyond || copying;
      stageEl.style.visibility = shown ? "visible" : "hidden";
      stageEl.style.pointerEvents = entered > 0.95 ? "" : "none";
      if (chrome.current) {
        const copy = beyond ? ramp(s, 0.02, 0.35) * dark : 0;
        chrome.current.style.opacity = String(copy);
        chrome.current.style.visibility = copy > 0.001 ? "visible" : "hidden";
      }
      const settled = entered;
      const within = lastInside ? settled > 0.6 : settled > 0.97;
      if (within !== lastInside) {
        lastInside = within;
        setInside(within);
      }

      if (!drag && glide) {
        offset[0] = follow(offset[0], glide[0], 5, dt);
        offset[1] = follow(offset[1], glide[1], 5, dt);
        if (Math.hypot(glide[0] - offset[0], glide[1] - offset[1]) < 0.002) {
          glide = null;
        }
      } else if (!drag && !reduced) {
        offset[0] += velocity[0] * dt;
        offset[1] += velocity[1] * dt;
        const decay = Math.exp(-3.2 * dt);
        velocity[0] *= decay;
        velocity[1] *= decay;
      }

      const sample = pointerSample();
      const present = sample.present && !reduced && entered > 0.95;
      const box = canvasEl.getBoundingClientRect();
      const sx = sample.x - box.left;
      const sy = sample.y - box.top;
      const aim: Vec2 = present
        ? [(sx - vw / 2) / vh, (sy - vh / 2) / vh]
        : [0, 0];
      focus[0] = follow(focus[0], aim[0], 9, dt);
      focus[1] = follow(focus[1], aim[1], 9, dt);
      lamp[0] = follow(lamp[0], aim[0], 3, dt);
      lamp[1] = follow(lamp[1], aim[1], 3, dt);
      lens = follow(lens, present ? 0.44 : 0.28, 3, dt);

      view = {
        bulge: 0.32,
        focus: [focus[0], focus[1]],
        height: vh,
        lens,
        pan: [home[0] + offset[0], home[1] + offset[1] + s * ROWS_PER_SCREEN],
        pitch: basePitch * zoom,
        radius: 0.3,
        width: vw,
      };

      const hover = present && !drag ? filmAt(wallAt(view, sx, sy), count) : -1;
      if (hover !== lastHover) {
        lastHover = hover;
        setHovered(hover);
        if (!drag) {
          if (hover >= 0) {
            canvasEl.dataset.cursor = "card";
            canvasEl.dataset.cursorLabel =
              hover === live.current.selected ? "Open" : "Pick";
          } else {
            delete canvasEl.dataset.cursor;
            delete canvasEl.dataset.cursorLabel;
          }
        }
      }

      if (!renderer || cancelled || (!shown && !copying)) return;

      const state = live.current;
      films.forEach((film, index) => {
        const look = looks[index]!;
        const isSeen = state.watched.has(film.id);
        const lift = Math.max(
          index === hover ? 1 : 0,
          index === state.selected ? 0.6 : 0,
        );
        const match =
          !state.known || state.filter === "all"
            ? 1
            : (state.filter === "seen") === isSeen
              ? 1
              : 0;
        look.lift = follow(look.lift, lift, 10, dt);
        look.seen = follow(look.seen, isSeen ? 1 : 0, 6, dt);
        look.match = follow(look.match, match, 6, dt);
        look.listed = state.listed.has(film.id);
      });

      const wall = {
        bulge: view.bulge,
        exposure,
        focus: view.focus,
        grain: reduced ? 0.02 : 0.05,
        lamp: [lamp[0], lamp[1]] as Vec2,
        lens: view.lens,
        marks: state.known,
        pan: view.pan,
        pitch: view.pitch * dpr,
        radius: view.radius,
        selected: state.selected,
        time: reduced ? 0 : now / 1000,
      };
      if (shown) {
        renderer.draw({ ...wall, mirror: copying ? portal.rect : null }, looks);
      }
      // Far down the corridor the doorway is a few pixels across; the copy
      // need not be fresh every frame until the camera is near.
      copied += 1;
      if (
        copying &&
        vw > 1 &&
        vh > 1 &&
        (portal.distance < 12 || copied % 4 === 0)
      ) {
        const width = COPY_WIDTH;
        const height = Math.max(1, Math.round((COPY_WIDTH * vh) / vw));
        const copy = portal.beyond;
        if (copy.pixels.length !== width * height * 4) {
          copy.pixels = new Uint8Array(width * height * 4);
        }
        if (renderer.capture(wall, looks, width, height, copy.pixels)) {
          copy.width = width;
          copy.height = height;
          copy.version += 1;
          // The colour the doorway throws: the average of what is in it.
          const pixels = copy.pixels;
          let r = 0;
          let g = 0;
          let b = 0;
          for (let i = 0; i < pixels.length; i += 16) {
            r += (pixels[i]! / 255) ** 2.2;
            g += (pixels[i + 1]! / 255) ** 2.2;
            b += (pixels[i + 2]! / 255) ** 2.2;
          }
          const n = pixels.length / 16;
          portal.colour = [r / n, g / n, b / n];
        }
      }
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
      canvasEl.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", cancel);
      canvasEl.removeEventListener("webglcontextrestored", restore);
      observer.disconnect();
      near.disconnect();
      stopPointer();
      renderer?.dispose();
    };
  }, [films, generation, reduced, router, scrollY]);

  const step = useCallback(
    (by: number) => {
      const next =
        (((selected + by) % films.length) + films.length) % films.length;
      setSelected(next);
      cue.current(next);
    },
    [films.length, selected],
  );

  const onKey = (event: KeyboardEvent<HTMLCanvasElement>) => {
    const moves: Record<string, number> = {
      ArrowDown: COLUMNS,
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -COLUMNS,
    };
    if (event.key in moves) {
      event.preventDefault();
      step(moves[event.key]!);
    } else if (event.key === "Enter" && films[selected]) {
      router.push(movieHref(films[selected].id));
    }
  };

  const current = films[selected] ?? films[0];
  const pointed = hovered >= 0 ? films[hovered] : undefined;

  const action = useMemo(
    () =>
      current ? (
        <CanonAction
          disabled={!auth.isReady || pending || (account !== null && !known)}
          listed={listed.has(current.id)}
          onOpen={() => router.push(movieHref(current.id))}
          onToggle={(kind) => void toggle(current, kind)}
          seen={watched.has(current.id)}
          title={current.title}
        />
      ) : null,
    [
      account,
      auth.isReady,
      current,
      known,
      listed,
      pending,
      router,
      toggle,
      watched,
    ],
  );

  if (films.length === 0) return <></>;

  return (
    <section
      ref={section}
      aria-labelledby="canon-title"
      className="relative"
      style={{
        height: `${(LENGTH + 1) * 100}svh`,
        marginTop: "-100svh",
      }}
    >
      <div
        ref={stage}
        className="invisible fixed inset-0 z-0 overflow-hidden bg-black"
      >
        <canvas
          ref={canvas}
          aria-label="The IMDb Top 100 as a wall of posters. Arrow keys move between films, Enter opens one."
          className="absolute inset-0 block size-full touch-pan-y outline-none select-none"
          onKeyDown={onKey}
          role="application"
          tabIndex={0}
        />

        {plain ? <PlainWall films={films} watched={watched} /> : null}

        <div
          ref={chrome}
          className="pointer-events-none invisible absolute inset-0 opacity-0"
        >
          <div
            aria-hidden
            className="absolute inset-x-0 top-0 h-[34svh] bg-linear-to-b from-black/70 to-transparent"
          />

          <header className="absolute top-[clamp(1.25rem,4.5svh,2.75rem)] left-(--gutter)">
            <h2
              id="canon-title"
              className="font-martina text-[clamp(1.6rem,2.4vw,2.35rem)] leading-none font-light text-white"
            >
              IMDb Top <span className="italic">100</span>
            </h2>
            <p className="mt-2.5 hidden max-w-[19rem] text-[13px] leading-snug text-white/45 sm:block">
              The hundred films voted greatest. Drag to wander, pick one to keep
              count.
            </p>
          </header>

          <div className="pointer-events-auto absolute top-[calc(clamp(1.25rem,4.5svh,2.75rem)+2.75rem)] left-(--gutter) flex flex-col items-start gap-3 sm:top-[clamp(1.25rem,4.5svh,2.75rem)] sm:right-(--gutter) sm:left-auto sm:items-end">
            {known ? (
              <>
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="flex flex-col items-end gap-1.5 pt-[0.35rem] text-right sm:pt-2">
                    <span className="font-martina text-[15px] leading-none font-light text-white/75 italic sm:text-[17px]">
                      seen
                    </span>
                    <span className="text-[11px] leading-none tracking-[0.16em] text-white/45 uppercase sm:text-[12px]">
                      of {films.length}
                    </span>
                  </div>
                  <span className="flex font-zuume text-[clamp(3.25rem,6.2vw,6.25rem)] leading-[0.8] text-white">
                    <Count places={3} value={seenCount} width="0.42em" />
                  </span>
                </div>
                <span
                  aria-hidden
                  className="relative block h-px w-32 bg-white/15 sm:w-40"
                >
                  <span
                    className="absolute inset-y-0 left-0 bg-white/80 transition-[width] duration-cinematic ease-out-quint"
                    style={{ width: `${(seenCount / films.length) * 100}%` }}
                  />
                </span>
                <div
                  aria-label="Show"
                  className={`flex gap-4 ${MONO}`}
                  role="radiogroup"
                >
                  {FILTERS.map((option) => (
                    <button
                      key={option.value}
                      aria-checked={filter === option.value}
                      className={`py-1 transition-colors duration-fast ${
                        filter === option.value
                          ? "text-white"
                          : "text-white/35 hover:text-white/70"
                      }`}
                      onClick={() => setFilter(option.value)}
                      role="radio"
                      type="button"
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </>
            ) : auth.isReady && !account ? (
              <button
                className={`group flex items-center gap-3 py-1 text-white/80 ${MONO}`}
                onClick={signIn}
                type="button"
              >
                Sign in to keep count
                <span
                  aria-hidden
                  className="block h-px w-8 origin-left bg-white/60 transition-transform duration-slow ease-out-quint group-hover:scale-x-[1.6]"
                />
              </button>
            ) : null}
          </div>

          <div
            aria-hidden
            className={`absolute bottom-[max(2.25rem,6svh)] left-(--gutter) hidden max-w-[min(30rem,32vw)] transition-[opacity,filter] duration-fast lg:block ${
              pointed ? "opacity-100 blur-0" : "opacity-0 blur-[3px]"
            }`}
          >
            <p className={`text-white/45 ${MONO}`}>
              No. {rankLabel(pointed?.rank ?? 1)}
              {pointed?.year ? ` · ${pointed.year}` : ""}
              {pointed && watched.has(pointed.id) ? " · Seen" : ""}
            </p>
            <p className="mt-2 font-martina text-[clamp(1.5rem,2.2vw,2.25rem)] leading-[1.05] font-light text-white">
              <Ticker direction={1} value={pointed?.title ?? ""} />
            </p>
          </div>
        </div>

        <ol className="sr-only">
          {films.map((film) => (
            <li key={film.id}>
              <Link href={movieHref(film.id)}>
                No. {film.rank}: {film.title}
                {watched.has(film.id) ? ", seen" : ""}
              </Link>
            </li>
          ))}
        </ol>
      </div>

      {current ? (
        <FilmDock
          action={action}
          description={[`No. ${current.rank}`, current.year, current.genres[0]]
            .filter(Boolean)
            .join(" · ")}
          film={current}
          shown={inside}
        />
      ) : null}
    </section>
  );
}

function CanonAction({
  disabled,
  listed,
  onOpen,
  onToggle,
  seen,
  title,
}: {
  disabled: boolean;
  listed: boolean;
  onOpen: () => void;
  onToggle: (kind: "watched" | "watchlist") => void;
  seen: boolean;
  title: string;
}): JSX.Element {
  const actionClass = useDockActionClass();

  return (
    <div className="flex w-full gap-2">
      <Button
        aria-pressed={seen}
        className={actionClass({ className: "min-w-0 flex-1", isActive: seen })}
        disabled={disabled}
        onClick={() => onToggle("watched")}
        type="button"
      >
        <Icon
          icon={seen ? "solar:check-circle-bold" : "solar:eye-bold"}
          size={16}
        />
        <span className="truncate">{seen ? "Seen" : "Mark seen"}</span>
      </Button>
      {seen ? null : (
        <Button
          aria-pressed={listed}
          className={actionClass({
            className: "min-w-0 flex-1",
            isActive: listed,
          })}
          disabled={disabled}
          onClick={() => onToggle("watchlist")}
          type="button"
        >
          <Icon
            icon={listed ? "solar:bookmark-bold" : "solar:bookmark-linear"}
            size={16}
          />
          <span className="truncate">{listed ? "Saved" : "Watchlist"}</span>
        </Button>
      )}
      <Button
        aria-label={`Open ${title}`}
        className={actionClass({ className: "w-12 shrink-0 px-0" })}
        onClick={onOpen}
        type="button"
      >
        <Icon icon="solar:arrow-right-up-linear" size={16} />
      </Button>
    </div>
  );
}

function PlainWall({
  films,
  watched,
}: {
  films: CanonMovie[];
  watched: ReadonlySet<number>;
}): JSX.Element {
  return (
    <div className="absolute inset-0 overflow-y-auto px-(--gutter) pt-36 pb-40">
      <ol className="grid grid-cols-[repeat(auto-fill,minmax(7rem,1fr))] gap-3">
        {films.map((film) => {
          const src = tmdbImageUrl("poster", film.posterPath, "w185");
          return (
            <li key={film.id}>
              <Link
                className={`block overflow-hidden rounded-xl ${watched.has(film.id) ? "" : "opacity-60 grayscale"}`}
                href={movieHref(film.id)}
              >
                {src ? (
                  <img
                    alt={`No. ${film.rank}: ${film.title}`}
                    className="aspect-[2/3] w-full object-cover"
                    loading="lazy"
                    src={src}
                  />
                ) : null}
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
