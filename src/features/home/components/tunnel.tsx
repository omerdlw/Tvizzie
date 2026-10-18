"use client";

import { useEffect, useMemo, useRef, useState, type JSX } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AnimatePresence,
  cancelFrame,
  frame,
  motion,
  useReducedMotion,
  type Variants,
} from "motion/react";
import { movieHref } from "@config/routes";
import { layoutTop } from "@/motion/flow";
import { pointerSample, watchPointer } from "@/motion/film/pointer";
import { useScrollY } from "@/motion/scroll";
import { tmdbImageUrl } from "@/infrastructure/tmdb/images";
import {
  MONTH_NAMES,
  WEEKDAY_NAMES,
  calendarDay,
  daysBetween,
  formatDay,
  relativeDay,
} from "../lib/format";
import { camera, insideQuad, project, type Vec3 } from "../lib/tunnel-camera";
import { bounds, point } from "../lib/cursor";
import { portal } from "../lib/portal";
import { useStop } from "../lib/stop";
import { paintFloor } from "../lib/tunnel-floor";
import { TunnelRenderer } from "../lib/tunnel-renderer";
import {
  OVERLAP,
  planTunnel,
  tunnelAt,
  type Chapter,
  type Dated,
  type TunnelPlan,
} from "../lib/tunnel-scene";
import type { ShowingMovie } from "../lib/types";
import { FilmDock } from "./film-dock";
import { Count, Drum, Ticker } from "./odometer";

const DEG = Math.PI / 180;
// How far ahead a lightbox switches on, and how long the switching takes to
// travel down the corridor, per unit of distance.
const WAKE = 11;
const CASCADE_MS = 95;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));
const follow = (from: number, to: number, rate: number, dt: number) =>
  from + (to - from) * (1 - Math.exp(-rate * dt));
const smooth = (t: number) => t * t * (3 - 2 * t);
const ramp = (value: number, a: number, b: number) =>
  smooth(clamp((value - a) / (b - a), 0, 1));
const noise = (n: number) => {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
};

// A lightbox catching: a few stutters, then steady.
function powerAt(elapsed: number, seed: number, reduced: boolean): number {
  if (elapsed <= 0) return 0;
  const t = elapsed / 1000;
  if (reduced) return Math.min(1, t / 0.6);
  if (t >= 0.85) return 1;
  const settle = clamp((t - 0.4) / 0.45, 0, 1);
  const stutter = noise(Math.floor(t * 21) + seed * 7.31) > 0.45 ? 1 : 0.08;
  return Math.min(1, t / 0.03) * (stutter * (1 - settle) + settle);
}

interface Entry {
  chapter: Chapter;
  film: ShowingMovie;
}

export interface TunnelProps {
  soon: ShowingMovie[];
  theatres: ShowingMovie[];
  today: string;
}

export function Tunnel({ soon, theatres, today }: TunnelProps): JSX.Element {
  const section = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const chrome = useRef<HTMLDivElement>(null);
  const hovered = useRef(-1);
  const quads = useRef<({ x: number; y: number }[] | null)[]>([]);
  const [active, setActive] = useState(0);
  const [day, setDay] = useState({ direction: 1, value: 0 });
  const [plain, setPlain] = useState(false);
  const [inside, setInside] = useState(false);
  const [generation, setGeneration] = useState(0);
  const scrollY = useScrollY();
  const router = useRouter();
  const reduced = Boolean(useReducedMotion());

  const entries = useMemo<Entry[]>(
    () => [
      ...theatres.map((film) => ({ chapter: "theatres" as const, film })),
      ...soon.map((film) => ({ chapter: "soon" as const, film })),
    ],
    [soon, theatres],
  );
  const dated = useMemo<Dated[]>(() => {
    let previous = 0;
    return entries.map(({ chapter, film }) => {
      const days = film.releaseDate
        ? daysBetween(today, film.releaseDate)
        : null;
      const value =
        chapter === "theatres"
          ? Math.min(0, days ?? previous)
          : Math.max(1, days ?? previous + 1, previous);
      previous = value;
      return { chapter, day: value };
    });
  }, [entries, today]);
  // Depth along the tunnel does not depend on the window, so the scroll it
  // takes can be known before anything is measured.
  const length = planTunnel(dated, 1.6).length;
  // Through the screen above, a flick comes to rest in the corridor.
  useStop(section, OVERLAP);

  useEffect(() => {
    const sectionEl = section.current;
    const stageEl = stage.current;
    const canvasEl = canvas.current;
    if (!sectionEl || !stageEl || !canvasEl || entries.length === 0) return;

    let dpr = 1;
    let vw = 1;
    let vh = 1;
    let top = 0;
    let plan: TunnelPlan = planTunnel(dated, 1.6);
    let visible = true;
    let cancelled = false;
    let lastActive = -1;
    let lastDay = Number.NaN;
    let lastInside = false;
    let lastAt = performance.now();
    let lastZ = plan.start;
    let velocity = 0;
    let fonts: { display: string; mono: string } | null = null;
    let painted = 0;
    const look = { x: 0, y: 0 };
    const hover = entries.map(() => 0);
    const litAt = entries.map(() => Number.NaN);
    const power = entries.map(() => 0);
    let gateAt = Number.NaN;

    // The nearest poster fills most of a tall window; a large one needs the
    // larger print to stay sharp.
    const longest =
      Math.max(window.innerWidth, window.innerHeight) *
      Math.min(window.devicePixelRatio || 1, 1.75);
    const print = longest > 1400 ? "w780" : "w500";
    const renderer = TunnelRenderer.create(
      canvasEl,
      entries.map(({ film }) => tmdbImageUrl("poster", film.posterPath, print)),
    );
    if (!renderer) setPlain(true);

    const paint = () => {
      if (!renderer || !fonts || painted === plan.corridor.half) return;
      const floor = paintFloor(
        plan,
        entries.map(({ chapter, film }) => ({
          date: film.releaseDate,
          soon: chapter === "soon",
        })),
        today,
        fonts,
        renderer.floorBudget.budget,
        renderer.floorBudget.limit,
      );
      renderer.setFloor(floor);
      painted = plan.corridor.half;
    };

    const measure = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      vw = stageEl.clientWidth;
      vh = stageEl.clientHeight;
      top = layoutTop(sectionEl);
      const width = Math.max(1, Math.round(vw * dpr));
      const height = Math.max(1, Math.round(vh * dpr));
      if (canvasEl.width !== width) canvasEl.width = width;
      if (canvasEl.height !== height) canvasEl.height = height;
      plan = planTunnel(dated, vw / vh);
      paint();
    };

    const style = getComputedStyle(document.body);
    const display =
      style.getPropertyValue("--font-zuume").trim() || "sans-serif";
    const mono =
      style.getPropertyValue("--font-basel-mono").trim() || "monospace";
    void Promise.all([
      document.fonts.load(`700 100px ${display}`),
      document.fonts.load(`400 100px ${mono}`),
    ])
      .catch(() => undefined)
      .then(() => {
        if (cancelled) return;
        fonts = { display, mono };
        paint();
      });

    const stopPointer = watchPointer();
    const observer = new ResizeObserver(measure);
    observer.observe(stageEl);
    observer.observe(document.body);
    const seen = new IntersectionObserver(([entry]) => {
      visible = Boolean(entry?.isIntersecting);
    });
    seen.observe(sectionEl);
    measure();

    const step = () => {
      const now = performance.now();
      const dt = clamp(now - lastAt, 1, 64) / 1000;
      lastAt = now;
      const raw = (scrollY.get() - top) / vh;
      const s = Number.isFinite(raw) ? clamp(raw, 0, length) : 0;
      const state = tunnelAt(s, plan);

      velocity = follow(
        velocity,
        clamp((lastZ - state.camZ) / dt / 7, -1, 1),
        6,
        dt,
      );
      lastZ = state.camZ;

      // The corridor lies under the opening's band as it bursts, whole
      // from the first frame: the band clears off it, it does not fade in.
      const shown = raw >= 0 ? 1 : 0;
      const through = state.through;
      stageEl.style.opacity = String(shown);
      stageEl.style.visibility = shown ? "visible" : "hidden";
      stageEl.style.pointerEvents = through > 0.9 ? "auto" : "none";
      // Past the last film the walk goes on into the dark, and the copy
      // about the films goes with it.
      const lastFilm = plan.posters[plan.posters.length - 1]?.z ?? plan.gate;
      const past = clamp((lastFilm - state.camZ + 0.2) / 1.6, 0, 1);
      // The words come once the last of the band is past the camera.
      const said = ramp(through, 0.7, 1);
      if (chrome.current) {
        const copy = said * (1 - past);
        chrome.current.style.opacity = String(copy);
        chrome.current.style.visibility = copy > 0.001 ? "visible" : "hidden";
      }
      // The dock takes over the film's credits after the words, and gives
      // the card back on the way out, either way.
      const lit = said * (1 - past);
      const within = lastInside ? lit > 0.35 : lit > 0.9;
      if (within !== lastInside) {
        lastInside = within;
        setInside(within);
      }

      if (state.active !== lastActive) {
        lastActive = state.active;
        setActive(state.active);
      }
      const onDay = Math.round(state.day);
      if (Number.isFinite(onDay) && onDay !== lastDay) {
        const direction = Number.isNaN(lastDay) || onDay > lastDay ? 1 : -1;
        lastDay = onDay;
        setDay({ direction, value: onDay });
      }

      portal.distance = state.camZ - plan.portal;
      // The canon may show through the doorway only once this canvas covers
      // the screen; while it is still dissolving in over the opening, the
      // canon's black would show through it too.
      portal.open = visible && !cancelled && through >= 0.999;
      if (!visible || cancelled || !shown) {
        stageEl.style.visibility = "hidden";
        point(canvasEl, null);
        // Off screen: the doorway is either still ahead or long behind.
        const through = s >= length - 1e-3 ? 1 : 0;
        portal.open = false;
        portal.through = through;
        portal.rect = through ? [0, 0, vw, vh] : [0, 0, 0, 0];
        return;
      }

      // The lightboxes ahead switch on as the camera nears them, the nearest
      // first, so on arrival the light runs away down the corridor.
      plan.posters.forEach((poster, index) => {
        const ahead = state.camZ - poster.z;
        if (
          Number.isNaN(litAt[index]!) &&
          ahead > -1 &&
          ahead < WAKE &&
          through > 0.12
        ) {
          litAt[index] = now + Math.max(0, ahead) * CASCADE_MS;
        }
        power[index] = Number.isNaN(litAt[index]!)
          ? 0
          : powerAt(now - litAt[index]!, index + 1, reduced);
      });
      const toGate = state.camZ - plan.gate;
      if (Number.isNaN(gateAt) && toGate < WAKE + 2 && through > 0.12) {
        gateAt = now + Math.max(0, toGate) * CASCADE_MS;
      }
      const gatePower = Number.isNaN(gateAt)
        ? 0
        : powerAt(now - gateAt, 0.5, reduced);
      // The doorway is clear in this canvas; the canon is drawn behind it.
      // Its small copy only lends the doorway's light to the corridor.
      renderer?.setBeyond(portal.beyond, portal.colour);

      const sample = pointerSample();
      const present = sample.present && !reduced;
      look.x = follow(look.x, present ? (sample.x / vw) * 2 - 1 : 0, 2.2, dt);
      look.y = follow(look.y, present ? (sample.y / vh) * 2 - 1 : 0, 2.2, dt);

      const portrait = vw / vh < 0.9;
      const drift = reduced ? 0 : Math.sin(now / 5200) * 0.01;
      const cam = camera(
        [0, 0, state.camZ],
        -look.x * 0.07 + drift,
        -0.07 - look.y * 0.04,
        ((portrait ? 70 : 56) + Math.abs(velocity) * 4) * DEG,
        vw / vh,
      );

      // Where the doorway lands on the page, for the canon beyond it.
      const { ceiling, floor, half } = plan.corridor;
      const jambs = (
        [
          [-half, ceiling],
          [half, ceiling],
          [half, floor],
          [-half, floor],
        ] as const
      ).map(([x, y]) => project(cam, [x, y, plan.portal], vw, vh));
      if (jambs.some((point) => !point)) {
        portal.rect = [0, 0, vw, vh];
        portal.through = 1;
      } else {
        const xs = jambs.map((point) => point!.x);
        const ys = jambs.map((point) => point!.y);
        const left = clamp(Math.min(...xs), 0, vw);
        const right = clamp(Math.max(...xs), 0, vw);
        const top_ = clamp(Math.min(...ys), 0, vh);
        const bottom = clamp(Math.max(...ys), 0, vh);
        portal.rect = [left, top_, right, bottom];
        portal.through = ((right - left) * (bottom - top_)) / (vw * vh);
      }

      // Through the doorway the canon has the whole screen.
      if (portal.through >= 1 && portal.distance < 0) {
        stageEl.style.visibility = "hidden";
        point(canvasEl, null);
        return;
      }

      // Where every poster lands on the page, for the pointer.
      let hit = -1;
      quads.current = plan.posters.map((poster, index) => {
        const ahead = state.camZ - poster.z;
        if (ahead < 0.6 || ahead > 16) return null;
        const cos = Math.cos(poster.yaw);
        const sin = Math.sin(poster.yaw);
        const corner = (dx: number, dy: number): Vec3 => [
          poster.x + cos * dx * poster.w,
          poster.y + dy * poster.h,
          poster.z - sin * dx * poster.w,
        ];
        const quad = [
          corner(-0.5, 0.5),
          corner(0.5, 0.5),
          corner(0.5, -0.5),
          corner(-0.5, -0.5),
        ].map((point) => project(cam, point, vw, vh));
        if (quad.some((point) => !point)) return null;
        const flat = quad as { x: number; y: number }[];
        if (
          present &&
          through > 0.9 &&
          state.exposure > 0.5 &&
          insideQuad(sample.x, sample.y, flat) &&
          (hit === -1 || poster.z > plan.posters[hit]!.z)
        ) {
          hit = index;
        }
        return flat;
      });

      hovered.current = hit;
      // The cursor frames the poster as it stands on the wall.
      const quad = hit >= 0 ? quads.current[hit] : null;
      const film = hit >= 0 ? entries[hit]?.film : undefined;
      point(
        canvasEl,
        quad && film
          ? { box: bounds(quad), corner: 2, title: film.title, year: film.year }
          : null,
      );
      hover.forEach((value, index) => {
        hover[index] = follow(value, index === hit ? 1 : 0, 8, dt);
      });

      renderer?.draw(
        {
          camera: cam,
          corridor: plan.corridor,
          exposure: state.exposure,
          gate: plan.gate,
          gatePower,
          grain: reduced ? 0.02 : 0.045,
          portal: plan.portal,
          hover,
          power,
          time: reduced ? 0 : now / 1000,
        },
        plan.posters,
      );
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
      portal.open = false;
      cancelFrame(step);
      observer.disconnect();
      seen.disconnect();
      stopPointer();
      canvasEl.removeEventListener("webglcontextrestored", restore);
      renderer?.dispose();
    };
  }, [dated, entries, generation, length, reduced, scrollY, today]);

  const open = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - box.left;
    const y = event.clientY - box.top;
    let target = hovered.current;
    if (target < 0) {
      quads.current.forEach((quad, index) => {
        if (quad && insideQuad(x, y, quad)) target = index;
      });
    }
    const entry = entries[target];
    if (entry) router.push(movieHref(entry.film.id));
  };

  if (entries.length === 0) return <></>;
  const current = entries[active] ?? entries[0]!;

  return (
    <section
      ref={section}
      aria-labelledby="tunnel-title"
      className="pointer-events-none relative"
      style={{
        height: `${(length + 1) * 100}svh`,
        marginTop: `${-(1 + OVERLAP) * 100}svh`,
      }}
    >
      <div
        ref={stage}
        className="invisible sticky top-0 z-10 h-svh w-full overflow-hidden opacity-0"
      >
        <canvas
          ref={canvas}
          aria-hidden
          className="absolute inset-0 block size-full"
          onClick={open}
        />

        {plain ? <PlainShelf entries={entries} /> : null}

        <div
          ref={chrome}
          className="pointer-events-none invisible absolute inset-0 opacity-0"
        >
          <h2 id="tunnel-title" className="sr-only">
            In theatres and coming soon
          </h2>

          <div
            aria-hidden
            className="absolute inset-x-0 top-0 h-[38svh] bg-linear-to-b from-black/55 to-transparent"
          />

          <ChapterHeading chapter={current.chapter} />
          <Calendar
            direction={day.direction}
            offset={day.value}
            today={today}
          />
        </div>

        <ul className="sr-only">
          {entries.map(({ chapter, film }) => (
            <li key={film.id}>
              <Link href={movieHref(film.id)}>
                {film.title}
                {chapter === "soon" && film.releaseDate
                  ? `, opens ${formatDay(film.releaseDate)}`
                  : ", in theatres"}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <FilmDock film={current.film} shown={inside} />
    </section>
  );
}

const SETTLE = [0.22, 1, 0.36, 1] as const;

const swap: Variants = {
  enter: (direction: number) => ({
    opacity: 0,
    y: `${direction * 0.7}em`,
  }),
  leave: (direction: number) => ({
    opacity: 0,
    transition: { duration: 0.45, ease: [0.55, 0, 0.75, 0.2] },
    y: `${direction * -0.7}em`,
  }),
  show: {
    opacity: 1,
    transition: { duration: 0.9, ease: SETTLE },
    y: "0em",
  },
};

// A word that changes by rolling out of the way of the next one.
function Rolling({
  className,
  direction,
  value,
}: {
  className?: string;
  direction: number;
  value: string;
}): JSX.Element {
  return (
    <span className={`relative inline-grid overflow-hidden ${className ?? ""}`}>
      <AnimatePresence custom={direction} initial={false}>
        <motion.span
          key={value}
          animate="show"
          className="[grid-area:1/1]"
          custom={direction}
          exit="leave"
          initial="enter"
          variants={swap}
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

function ChapterHeading({ chapter }: { chapter: Chapter }): JSX.Element {
  const soon = chapter === "soon";
  return (
    <header className="absolute top-[clamp(1.25rem,4.5svh,2.75rem)] left-(--gutter)">
      <p className="font-martina text-[clamp(1.6rem,2.4vw,2.35rem)] leading-none font-light text-white">
        <Rolling direction={soon ? 1 : -1} value={soon ? "Coming" : "In"} />{" "}
        <Rolling
          className="italic"
          direction={soon ? 1 : -1}
          value={soon ? "soon" : "theatres"}
        />
      </p>
      <p className="mt-2.5 hidden max-w-[18rem] text-[13px] leading-snug text-white/45 sm:block">
        <Rolling
          direction={soon ? 1 : -1}
          value={
            soon
              ? "The most awaited, in the order they open"
              : "The most watched, in the order they opened"
          }
        />
      </p>
    </header>
  );
}

function Calendar({
  direction,
  offset,
  today,
}: {
  direction: number;
  offset: number;
  today: string;
}): JSX.Element {
  const { date, month, weekday } = calendarDay(today, offset);
  const now = offset === 0;
  const days = Math.abs(offset);
  const counted = days >= 2;

  return (
    <div
      aria-hidden
      className="absolute top-[clamp(1.25rem,4.5svh,2.75rem)] right-(--gutter) flex flex-col items-end"
    >
      <div className="flex items-start gap-3 sm:gap-4">
        <div className="flex flex-col items-end gap-1 pt-[0.2rem] text-right sm:pt-1.5">
          <Drum
            align="end"
            className="font-martina text-[15px] leading-none font-light text-white/75 italic sm:text-[17px]"
            index={weekday}
            items={WEEKDAY_NAMES}
          />
          <Drum
            align="end"
            className="text-[11px] leading-none tracking-[0.16em] text-white/45 uppercase sm:text-[12px]"
            index={month}
            items={MONTH_NAMES}
          />
        </div>
        <span className="flex font-zuume text-[clamp(3.25rem,6.2vw,6.25rem)] leading-[0.8] text-white">
          <Count pad places={2} value={date} width="0.42em" />
        </span>
      </div>
      <p
        className={`mt-3 flex items-center gap-2 text-[13px] transition-colors duration-slow ${now ? "text-[rgb(255_244_226)]" : "text-white/50"}`}
      >
        <span
          className={`block h-px origin-right bg-current transition-[width] duration-cinematic ease-out-quint ${now ? "w-8" : "w-4"}`}
        />
        {counted ? (
          <span className="inline-flex items-baseline gap-[0.28em] tabular-nums">
            {offset > 0 ? <span>In</span> : null}
            <Count value={days} />
            <span>{offset < 0 ? "days ago" : "days"}</span>
          </span>
        ) : (
          <Ticker direction={direction} value={relativeDay(offset)} />
        )}
      </p>
    </div>
  );
}

function PlainShelf({ entries }: { entries: Entry[] }): JSX.Element {
  return (
    <div className="absolute inset-x-(--gutter) top-1/2 flex -translate-y-1/2 gap-4 overflow-x-auto">
      {entries.map(({ film }) => {
        const src = tmdbImageUrl("poster", film.posterPath, "w342");
        return src ? (
          <Link
            key={film.id}
            className="w-36 shrink-0"
            href={movieHref(film.id)}
          >
            <img
              alt={film.title}
              className="aspect-[2/3] w-full object-cover"
              src={src}
            />
          </Link>
        ) : null;
      })}
    </div>
  );
}
