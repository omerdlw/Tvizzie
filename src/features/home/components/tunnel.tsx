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
} from "motion/react";
import { movieHref } from "@config/routes";
import { layoutTop } from "@/motion/flow";
import { pointerSample, watchPointer } from "@/motion/film/pointer";
import { useScrollY } from "@/motion/scroll";
import { tmdbImageUrl } from "@/infrastructure/tmdb/images";
import { formatDay, formatToday, untilLabel } from "../lib/format";
import { camera, insideQuad, project, type Vec3 } from "../lib/tunnel-camera";
import { TunnelRenderer } from "../lib/tunnel-renderer";
import {
  planTunnel,
  tunnelAt,
  type Chapter,
  type TunnelPlan,
} from "../lib/tunnel-scene";
import type { HomeMovie } from "../lib/types";
import {
  CreditTitle,
  MONO,
  OpenFilm,
  creditLine,
  usePresenceDirection,
} from "./credits";

const DEG = Math.PI / 180;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));
const follow = (from: number, to: number, rate: number, dt: number) =>
  from + (to - from) * (1 - Math.exp(-rate * dt));

interface Entry {
  chapter: Chapter;
  film: HomeMovie;
}

export interface TunnelProps {
  soon: HomeMovie[];
  theatres: HomeMovie[];
  today: string;
}

export function Tunnel({ soon, theatres, today }: TunnelProps): JSX.Element {
  const section = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const chrome = useRef<HTMLDivElement>(null);
  const labels = useRef<HTMLDivElement>(null);
  const hovered = useRef(-1);
  const quads = useRef<({ x: number; y: number }[] | null)[]>([]);
  const [active, setActive] = useState({ direction: 1, index: 0 });
  const [plain, setPlain] = useState(false);
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
  // Depth along the tunnel does not depend on the window, so the scroll it
  // takes can be known before anything is measured.
  const length = planTunnel(theatres.length, soon.length, 1.6).length;

  useEffect(() => {
    const sectionEl = section.current;
    const stageEl = stage.current;
    const canvasEl = canvas.current;
    if (!sectionEl || !stageEl || !canvasEl || entries.length === 0) return;

    let dpr = 1;
    let vw = 1;
    let vh = 1;
    let top = 0;
    let plan: TunnelPlan = planTunnel(theatres.length, soon.length, 1.6);
    let visible = true;
    let cancelled = false;
    let lastActive = 0;
    let lastAt = performance.now();
    let lastZ = plan.start;
    let velocity = 0;
    const look = { x: 0, y: 0 };
    const hover = entries.map(() => 0);

    const renderer = TunnelRenderer.create(
      canvasEl,
      entries.map(({ film }) =>
        tmdbImageUrl("poster", film.posterPath, "w500"),
      ),
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
      plan = planTunnel(theatres.length, soon.length, vw / vh);
    };

    const stopPointer = watchPointer();
    const observer = new ResizeObserver(measure);
    observer.observe(stageEl);
    observer.observe(document.body);
    const seen = new IntersectionObserver(([entry]) => {
      visible = Boolean(entry?.isIntersecting);
    });
    seen.observe(sectionEl);
    measure();

    const labelEls = () =>
      labels.current?.querySelectorAll<HTMLElement>("[data-label]") ?? [];

    const step = () => {
      const now = performance.now();
      const dt = clamp(now - lastAt, 1, 64) / 1000;
      lastAt = now;
      const s = clamp((scrollY.get() - top) / vh, 0, length);
      const state = tunnelAt(s, plan);

      velocity = follow(
        velocity,
        clamp((lastZ - state.camZ) / dt / 7, -1, 1),
        6,
        dt,
      );
      lastZ = state.camZ;

      if (chrome.current) {
        const shown = clamp(state.exposure * 1.4 - 0.3, 0, 1);
        chrome.current.style.opacity = String(shown);
        chrome.current.style.visibility = shown > 0.001 ? "visible" : "hidden";
      }
      stageEl.style.setProperty("--theatres", String(state.theatres));
      stageEl.style.setProperty("--soon", String(state.soon));

      if (state.active !== lastActive) {
        const direction = state.active > lastActive ? 1 : -1;
        lastActive = state.active;
        setActive({ direction, index: state.active });
      }

      if (!visible || cancelled) return;

      const sample = pointerSample();
      const present = sample.present && !reduced;
      look.x = follow(look.x, present ? (sample.x / vw) * 2 - 1 : 0, 2.2, dt);
      look.y = follow(look.y, present ? (sample.y / vh) * 2 - 1 : 0, 2.2, dt);

      const portrait = vw / vh < 0.9;
      const drift = reduced ? 0 : Math.sin(now / 4200) * 0.012;
      const cam = camera(
        [0, 0, state.camZ],
        -look.x * 0.075 + drift,
        -look.y * 0.045,
        ((portrait ? 72 : 58) + Math.abs(velocity) * 5) * DEG,
        vw / vh,
      );

      // Where every poster lands on the page, for the pointer and the labels.
      let hit = -1;
      const lit = labelEls();
      let labelIndex = 0;
      quads.current = plan.posters.map((poster, index) => {
        const ahead = state.camZ - poster.z;
        const cos = Math.cos(poster.yaw);
        const sin = Math.sin(poster.yaw);
        const corner = (dx: number, dy: number): Vec3 => [
          poster.x + cos * dx * poster.w,
          poster.y + dy * poster.h,
          poster.z - sin * dx * poster.w,
        ];

        if (poster.chapter === "soon") {
          const label = lit[labelIndex++];
          if (label) {
            const at = project(cam, corner(0, -0.5), vw, vh);
            const fade =
              at && ahead > 0.6
                ? Math.exp(-Math.max(ahead - 1, 0) * 0.28) *
                  clamp((ahead - 1.1) / 0.8, 0, 1) *
                  state.exposure
                : 0;
            const shown = at && fade > 0.01;
            label.style.opacity = shown ? String(fade) : "0";
            if (shown) {
              const scale = clamp(2.2 / at.depth, 0.35, 1.25);
              label.style.transform = `translate(${at.x}px, ${at.y + 10 * scale}px) translateX(-50%) scale(${scale})`;
            }
          }
        }

        if (ahead < 0.3 || ahead > 16) return null;
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
          state.exposure > 0.5 &&
          insideQuad(sample.x, sample.y, flat) &&
          (hit === -1 || poster.z > plan.posters[hit]!.z)
        ) {
          hit = index;
        }
        return flat;
      });

      const gateLabel =
        labels.current?.querySelector<HTMLElement>("[data-gate]");
      if (gateLabel) {
        const at = project(cam, [0, 0.74, plan.gate], vw, vh);
        const ahead = state.camZ - plan.gate;
        const fade =
          at && ahead > 0.5
            ? (1 - clamp((ahead - 6) / 4, 0, 1)) *
              clamp((ahead - 0.5) / 0.8, 0, 1) *
              state.exposure
            : 0;
        // It gives way before it reaches the rail along the top.
        const clear = at ? clamp((at.y - 110) / 90, 0, 1) : 0;
        gateLabel.style.opacity = String(fade * clear);
        if (at && fade * clear > 0.01) {
          const scale = clamp(3 / at.depth, 0.4, 1.4);
          gateLabel.style.transform = `translate(${at.x}px, ${at.y}px) translate(-50%, -100%) scale(${scale})`;
        }
      }

      if (hit !== hovered.current) {
        hovered.current = hit;
        if (hit >= 0) {
          canvasEl.dataset.cursor = "card";
          canvasEl.dataset.cursorLabel = "View";
        } else {
          delete canvasEl.dataset.cursor;
          delete canvasEl.dataset.cursorLabel;
        }
      }
      hover.forEach((value, index) => {
        hover[index] = follow(value, index === hit ? 1 : 0, 9, dt);
      });

      renderer?.draw(
        {
          camera: cam,
          exposure: state.exposure,
          gate: plan.gate,
          grain: reduced ? 0.04 : 0.08,
          hover,
          time: reduced ? 0 : now / 1000,
          velocity: reduced ? 0 : velocity,
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
      cancelFrame(step);
      observer.disconnect();
      seen.disconnect();
      stopPointer();
      canvasEl.removeEventListener("webglcontextrestored", restore);
      renderer?.dispose();
    };
  }, [
    entries,
    generation,
    length,
    reduced,
    scrollY,
    soon.length,
    theatres.length,
  ]);

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
  const current = entries[active.index] ?? entries[0]!;

  return (
    <section
      ref={section}
      aria-labelledby="tunnel-title"
      className="relative"
      style={{ height: `${(length + 1) * 100}svh` }}
    >
      <div
        ref={stage}
        className="sticky top-0 h-svh w-full overflow-hidden bg-black"
      >
        <canvas
          ref={canvas}
          aria-hidden
          className="absolute inset-0 block size-full"
          onClick={open}
        />

        <div
          ref={labels}
          aria-hidden
          className="pointer-events-none absolute inset-0"
        >
          {entries.map(({ chapter, film }) =>
            chapter === "soon" ? (
              <div
                key={film.id}
                className="absolute top-0 left-0 flex origin-top flex-col items-center gap-1 whitespace-nowrap opacity-0 will-change-transform"
                data-label
              >
                <span className="font-zuume text-[1.75rem] leading-none text-white uppercase">
                  {film.releaseDate ? formatDay(film.releaseDate) : "Soon"}
                </span>
                {film.releaseDate ? (
                  <span className={`${MONO} text-[rgb(140_195_255)]`}>
                    {untilLabel(film.releaseDate, today)}
                  </span>
                ) : null}
              </div>
            ) : null,
          )}
          <div
            className="absolute top-0 left-0 flex origin-bottom flex-col items-center gap-1.5 whitespace-nowrap opacity-0 will-change-transform"
            data-gate
          >
            <span className={`${MONO} text-white/60`}>Today</span>
            <span className="font-zuume text-[2.5rem] leading-none text-white uppercase">
              {formatToday(today)}
            </span>
          </div>
        </div>

        {plain ? <PlainShelf entries={entries} /> : null}

        <div
          ref={chrome}
          className="pointer-events-none invisible absolute inset-0 opacity-0"
        >
          <h2 id="tunnel-title" className="sr-only">
            In theatres and coming soon
          </h2>
          <header
            className={`absolute inset-x-(--gutter) top-[clamp(1.25rem,4svh,2.75rem)] flex items-center gap-3 sm:gap-5 ${MONO}`}
          >
            <span
              className={
                current.chapter === "theatres"
                  ? "text-white/90"
                  : "text-white/35"
              }
            >
              In theatres
            </span>
            <Rail fill="var(--theatres)" tone="bg-[rgb(255_153_77)]" />
            <span className="text-white/55">Today</span>
            <Rail fill="var(--soon)" tone="bg-[rgb(107_179_255)]" />
            <span
              className={
                current.chapter === "soon" ? "text-white/90" : "text-white/35"
              }
            >
              Coming soon
            </span>
          </header>

          <div
            aria-hidden
            className="absolute bottom-0 left-0 h-[70svh] w-[min(56rem,100%)] bg-[radial-gradient(ellipse_at_0%_100%,rgb(0_0_0/0.72),rgb(0_0_0/0.35)_45%,transparent_72%)]"
          />
          <div className="pointer-events-auto absolute bottom-[max(7rem,14svh)] left-(--gutter) grid w-[min(34rem,calc(100%-2*var(--gutter)))]">
            <AnimatePresence custom={active.direction} initial={false}>
              <TunnelCredit
                key={current.film.id}
                direction={active.direction}
                entry={current}
                today={today}
              />
            </AnimatePresence>
          </div>
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
    </section>
  );
}

function Rail({ fill, tone }: { fill: string; tone: string }): JSX.Element {
  return (
    <span aria-hidden className="relative h-px min-w-6 flex-1 bg-white/12">
      <span
        className={`absolute inset-0 origin-left ${tone}`}
        style={{ transform: `scaleX(${fill})` }}
      />
    </span>
  );
}

function TunnelCredit({
  direction,
  entry,
  today,
}: {
  direction: number;
  entry: Entry;
  today: string;
}): JSX.Element {
  const way = usePresenceDirection(direction);
  const { chapter, film } = entry;
  const opens =
    chapter === "soon" && film.releaseDate
      ? `Opens ${formatDay(film.releaseDate)} · ${untilLabel(film.releaseDate, today)}`
      : "In theatres now";

  return (
    <motion.article
      animate="show"
      className="min-w-0 [grid-area:1/1]"
      custom={way}
      exit="leave"
      initial="enter"
    >
      <motion.p
        className={`mb-3 flex items-center gap-3 sm:mb-4 ${MONO}`}
        custom={way}
        variants={creditLine}
      >
        <span
          aria-hidden
          className={`size-1.5 rounded-full ${chapter === "soon" ? "bg-[rgb(107_179_255)]" : "bg-[rgb(255_153_77)]"}`}
        />
        <span className="text-white/85">{opens}</span>
      </motion.p>
      <CreditTitle
        className="font-zuume text-[clamp(2.5rem,4.2vw,4.75rem)] leading-[0.9] text-balance text-white uppercase"
        direction={way}
        title={film.title}
      />
      <motion.div
        className="mt-3 flex flex-col items-start gap-3 sm:mt-4"
        custom={way}
        variants={creditLine}
      >
        <p className={`flex flex-wrap gap-x-4 text-white/45 ${MONO}`}>
          {film.year ? <span>{film.year}</span> : null}
          {film.genres.length > 0 ? (
            <span>{film.genres.join(" · ")}</span>
          ) : null}
        </p>
        <OpenFilm id={film.id} />
      </motion.div>
    </motion.article>
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
