"use client";

import { useEffect, useRef, useState, type JSX } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { cn } from "@omerdlw/base-framework/utils";
import { AvatarStack } from "@/features/social";
import { Projection } from "@/motion/film";
import {
  Ambient,
  Backdrop,
  Body,
  EASE,
  GRAMMAR,
  Grade,
  ease,
  size,
  unit,
} from "@/motion/stage";
import { tmdbImageUrl } from "@/infrastructure/tmdb/images";
import { movieHref } from "@/config/routes";
import { Icon, PROSE_CLASS, TONE, headlineClass, pageBodyClass } from "@/ui";
import type { Feature } from "../lib/types";
import { FilmDock } from "./film-dock";

// One film every nine seconds; the projector's own cut carries the change.
const CYCLE_MS = 9000;
const SWAP = size(2);
const REEL = "w1280";

const [FROM, TO] = GRAMMAR.scrub.defocus.range;
const defocusAt = (y: number) => ease.glide(unit((y - FROM) / (TO - FROM)));

const titleClass = (title: string) => headlineClass(title, [22, 32, 44]);

function runtime(minutes: number | null): string | null {
  if (!minutes) return null;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours ? `${hours}h ${rest ? `${rest}m` : ""}`.trim() : `${rest}m`;
}

function reasonOf(film: Feature): string {
  const parts: string[] = [];
  if (film.social) parts.push("Popular on Guffin");
  if (film.trending) parts.push(`Trending #${film.trending} worldwide`);
  return parts.join(" · ") || "Featured";
}

function SocialLine({ film }: { film: Feature }): JSX.Element | null {
  if (!film.social) return null;
  const { faces, rating, watchers } = film.social;
  return (
    <div className="flex items-center gap-3 text-[13px] text-white/60 tabular-nums">
      {faces.length > 0 ? (
        <AvatarStack
          people={faces.map((face) => ({ ...face, id: face.username }))}
          round
          size={24}
        />
      ) : null}
      <span>
        <span className="font-semibold text-white/85">
          {watchers.toLocaleString("en-US")}
        </span>{" "}
        {watchers === 1 ? "member" : "members"} this week
      </span>
      {rating ? (
        <span className="inline-flex items-center gap-1">
          <Icon className="text-amber-400" icon="solar:star-bold" size={13} />
          {rating.toFixed(1)}
        </span>
      ) : null}
    </div>
  );
}

function Synopsis({ film }: { film: Feature }): JSX.Element {
  const facts = [film.year, film.genres.join(", "), runtime(film.runtime)]
    .filter(Boolean)
    .join(" · ");
  return (
    <div className="flex flex-col">
      <p className={`${TONE.label} text-[rgb(var(--grade))]`}>
        {reasonOf(film)}
      </p>
      <h2 className={cn(titleClass(film.title), "mt-4")}>
        <Link className="ui-fade hover:opacity-80" href={movieHref(film.id)}>
          {film.title}
        </Link>
      </h2>
      {facts ? (
        <p className="mt-4 text-sm font-medium text-white/60">{facts}</p>
      ) : null}
      {film.logline ? (
        <p className={cn(PROSE_CLASS, "mt-5 text-white/75")}>{film.logline}</p>
      ) : null}
      <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-4">
        <Link
          className="inline-flex h-10 items-center gap-2 rounded-full bg-white px-5 text-[13px] font-medium text-black hover:bg-white/85"
          href={movieHref(film.id)}
        >
          <Icon icon="solar:play-bold" size={14} />
          Open film
        </Link>
        <SocialLine film={film} />
      </div>
    </div>
  );
}

function Reels({
  active,
  features,
  onPick,
  paused,
}: {
  active: number;
  features: Feature[];
  onPick: (index: number) => void;
  paused: boolean;
}): JSX.Element {
  return (
    <ol
      aria-label="Featured films"
      className="grid grid-cols-5 gap-2 lg:flex lg:flex-col lg:gap-0"
    >
      {features.map((film, index) => {
        const on = index === active;
        return (
          <li key={film.id}>
            <button
              aria-current={on ? "true" : undefined}
              aria-label={`Show ${film.title}`}
              className="group/reel relative flex w-full cursor-pointer flex-col py-3 text-left lg:flex-row lg:items-baseline lg:gap-4 lg:py-3.5"
              onClick={() => onPick(index)}
              type="button"
            >
              <span
                className={cn(
                  "hidden text-[11px] font-semibold tracking-[0.14em] tabular-nums lg:inline",
                  on
                    ? "text-white"
                    : "text-white/35 group-hover/reel:text-white/70",
                )}
              >
                {String(index + 1).padStart(2, "0")}
              </span>
              <span
                className={cn(
                  "hidden min-w-0 truncate text-sm font-medium lg:block",
                  on
                    ? "text-white"
                    : "text-white/45 group-hover/reel:text-white/80",
                )}
              >
                {film.title}
              </span>
              <span
                aria-hidden="true"
                className="absolute inset-x-0 bottom-0 h-0.5 overflow-hidden bg-white/[0.12] lg:h-px lg:bg-white/[0.06]"
              >
                {on ? (
                  <span
                    className="home-reel absolute inset-0 origin-left bg-white/80"
                    key={film.id}
                    style={{
                      animationDuration: `${CYCLE_MS}ms`,
                      animationPlayState: paused ? "paused" : "running",
                    }}
                  />
                ) : null}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

export function HomeHero({
  features,
}: {
  features: Feature[];
}): JSX.Element | null {
  const reduced = Boolean(useReducedMotion());
  const root = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [inView, setInView] = useState(true);
  const [visible, setVisible] = useState(true);
  const film = features[active] ?? features[0];
  const paused = reduced || hovered || !inView || !visible;

  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      ([entry]) => setInView(Boolean(entry?.isIntersecting)),
      { threshold: 0.25 },
    );
    observer.observe(element);
    const sync = () => setVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", sync);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);

  // The bar under the current film shows the time left, so the timer resets
  // whenever the film changes, and a pause holds both.
  const left = useRef(CYCLE_MS);
  useEffect(() => {
    left.current = CYCLE_MS;
  }, [active]);
  useEffect(() => {
    if (paused || features.length < 2) return;
    const started = performance.now();
    const timer = setTimeout(
      () => setActive((index) => (index + 1) % features.length),
      left.current,
    );
    return () => {
      clearTimeout(timer);
      left.current = Math.max(0, left.current - (performance.now() - started));
    };
  }, [active, features.length, paused]);

  // Warm the next still so the projector's cut never waits on the network.
  useEffect(() => {
    const next = features[(active + 1) % features.length];
    const src = next ? tmdbImageUrl("backdrop", next.backdropPath, REEL) : null;
    if (!src) return;
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.src = src;
  }, [active, features]);

  if (!film) return null;
  const first = features[0]!;
  const src = tmdbImageUrl("backdrop", first.backdropPath, "original")!;
  const reel =
    active === 0 ? null : tmdbImageUrl("backdrop", film.backdropPath, REEL);
  const room = tmdbImageUrl("backdrop", film.backdropPath, "w300");

  return (
    <div ref={root}>
      <FilmDock film={film} shown={inView} />
      {room ? <Ambient rises={false} source={room} /> : null}
      <Backdrop>
        {(reveal) => (
          <>
            <Grade source={room} />
            <Projection
              cut={GRAMMAR.film.cut}
              defocusAt={defocusAt}
              halation={GRAMMAR.film.halation}
              onReady={reveal}
              position="center 25%"
              reel={reel}
              src={src}
            />
          </>
        )}
      </Backdrop>

      <Body className={pageBodyClass(true)}>
        <div
          className="grid w-full grid-cols-1 items-end gap-x-12 gap-y-8 lg:grid-cols-[minmax(0,1fr)_17rem]"
          onBlur={() => setHovered(false)}
          onFocus={() => setHovered(true)}
          onPointerEnter={() => setHovered(true)}
          onPointerLeave={() => setHovered(false)}
        >
          <motion.div
            animate={{ opacity: 1 }}
            className="grid min-w-0"
            initial={{ opacity: 0 }}
            transition={{
              delay: GRAMMAR.title.at,
              duration: GRAMMAR.title.run,
              ease: EASE.fade,
            }}
          >
            <AnimatePresence initial={false}>
              <motion.div
                animate={{ opacity: 1 }}
                className="[grid-area:1/1]"
                exit={{
                  opacity: 0,
                  transition: { duration: SWAP / 2, ease: EASE.fade },
                }}
                initial={{ opacity: 0 }}
                key={film.id}
                transition={{
                  delay: SWAP / 3,
                  duration: SWAP,
                  ease: EASE.pour,
                }}
              >
                <Synopsis film={film} />
              </motion.div>
            </AnimatePresence>
          </motion.div>
          {features.length > 1 ? (
            <motion.div
              animate={{ opacity: 1 }}
              initial={{ opacity: 0 }}
              transition={{
                delay: GRAMMAR.title.at + size(1),
                duration: GRAMMAR.title.run,
                ease: EASE.fade,
              }}
            >
              <Reels
                active={active}
                features={features}
                onPick={setActive}
                paused={paused}
              />
            </motion.div>
          ) : null}
        </div>
      </Body>
    </div>
  );
}
