"use client";

import {
  useEffect,
  useRef,
  useState,
  type JSX,
  type KeyboardEvent,
} from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useAmbientTheme } from "@omerdlw/base-framework/modules/ambient";
import { cn } from "@omerdlw/base-framework/utils";
import { movieHref } from "@/config/routes";
import { useArtworkPath } from "@/features/artwork";
import { AdaptiveImage } from "@/ui";
import {
  CONTAINER_CLASS,
  Drift,
  HeroStage,
  useDockLinkClick,
  useLeaving,
} from "@/motion";
import { EASE, blur, span } from "@/motion/cinema/score";
import { BACKDROP_HERO_MASK } from "@/ui/backdrop-hero";
import { tmdbImageSrcSet, tmdbImageUrl } from "@/infrastructure/tmdb/images";
import { REEL_SECONDS } from "../lib/constants";
import { REEL_INTRO } from "../lib/motion";
import type { ReelMovie } from "../lib/types";

const HEIGHT = "h-[min(100svh,58rem)] min-h-[38rem]";

const TITLE =
  "font-zuume leading-[0.88] font-bold uppercase text-[clamp(2.4rem,min(7.4vw,9.4svh),6.25rem)]";

function shortTitle(title: string): string {
  const head = title.split(/\s*[:–—]\s+/)[0]?.trim() ?? "";
  return head.length >= 2 ? head : title;
}

const pad = (n: number) => String(n).padStart(2, "0");

function Backdrop({
  movie,
  priority,
}: {
  movie: ReelMovie;
  priority: boolean;
}): JSX.Element {
  const path = useArtworkPath(
    "movie",
    movie.id,
    "backdrop",
    movie.backdropPath,
  );

  return (
    <motion.div
      animate={{ clipPath: "inset(0% 0% 0% 0%)" }}
      className="absolute inset-0"
      exit={{ opacity: 0, transition: { delay: span(2), duration: 0.01 } }}
      initial={{ clipPath: "inset(0% 0% 100% 0%)" }}
      transition={{ duration: span(2), ease: EASE.expo }}
    >
      <motion.div
        animate={{ scale: 1 }}
        className="absolute inset-0"
        initial={{ scale: 1.14 }}
        transition={{ duration: span(4), ease: EASE.expo }}
      >
        <AdaptiveImage
          alt=""
          className="object-cover object-[center_20%]"
          priority={priority}
          sizes="100vw"
          src={tmdbImageUrl("backdrop", path, "w1280")}
          srcSet={
            tmdbImageSrcSet("backdrop", path, ["w780", "w1280"]) ?? undefined
          }
          wrapperClassName="absolute inset-0"
        />
      </motion.div>
    </motion.div>
  );
}

function Row({
  active,
  movie,
  onSelect,
  position,
}: {
  active: boolean;
  movie: ReelMovie;
  onSelect: () => void;
  position: number;
}): JSX.Element {
  const leaving = useLeaving();
  const href = movieHref(movie.id);
  const onClick = useDockLinkClick(href);

  return (
    <li>
      <Link
        aria-current={active}
        className="group/row flex items-baseline gap-4 outline-none"
        href={href}
        onClick={onClick}
        onFocus={onSelect}
        onPointerEnter={onSelect}
        prefetch={false}
      >
        <span
          className={cn(
            "cine-fade w-7 shrink-0 text-[11px] font-semibold tracking-[0.18em] tabular-nums",
            active ? "text-white" : "text-white/30",
          )}
        >
          {pad(position + 1)}
        </span>
        <span className="relative min-w-0 overflow-hidden pb-[0.08em]">
          <span
            className={cn(
              "block transition-[translate] duration-slow ease-out-expo",
              active && "translate-x-3",
            )}
          >
            <motion.span
              animate={{ y: leaving ? "-110%" : "0%" }}
              className={cn(
                "cine-fade block truncate",
                TITLE,
                active
                  ? "text-white"
                  : "text-white/25 group-hover/row:text-white/60 group-focus-visible/row:text-white/60",
              )}
              initial={{ y: "110%" }}
              transition={{
                delay: leaving
                  ? position * 0.05
                  : REEL_INTRO.rows + position * 0.09,
                duration: span(2),
                ease: leaving ? EASE.glide : EASE.expo,
              }}
            >
              {shortTitle(movie.title)}
            </motion.span>
          </span>
        </span>
        {movie.year ? (
          <span
            className={cn(
              "cine-fade hidden shrink-0 text-xs font-semibold tabular-nums sm:inline",
              active ? "text-white/70" : "text-white/20",
            )}
          >
            {movie.year}
          </span>
        ) : null}
      </Link>
    </li>
  );
}

export function HomeReel({
  movies,
}: {
  movies: readonly ReelMovie[];
}): JSX.Element {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [touched, setTouched] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [inView, setInView] = useState(true);
  const root = useRef<HTMLElement>(null);
  const list = useRef<HTMLOListElement>(null);
  const count = movies.length;
  const movie = movies[index];
  const playing = !reduced && !touched && !hidden && inView && count > 1;

  useAmbientTheme({
    image: tmdbImageUrl("backdrop", movie.backdropPath, "w780"),
  });

  useEffect(() => {
    const onVisibility = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry?.isIntersecting ?? true),
      { threshold: 0.35 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(
      () => setIndex((current) => (current + 1) % count),
      REEL_SECONDS * 1000,
    );
    return () => clearInterval(timer);
  }, [count, playing]);

  useEffect(() => {
    const next = movies[(index + 1) % count];
    const url = next && tmdbImageUrl("backdrop", next.backdropPath, "w1280");
    if (url) new Image().src = url;
  }, [count, index, movies]);

  const select = (position: number) => {
    setTouched(true);
    setIndex(position);
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    const next = (index + (event.key === "ArrowDown" ? 1 : count - 1)) % count;
    select(next);
    list.current?.querySelectorAll("a")[next]?.focus();
  };

  return (
    <section
      aria-label="On the reel"
      className={cn("relative isolate w-full", HEIGHT)}
      ref={root}
    >
      <div aria-hidden="true" className="absolute inset-0">
        <HeroStage>
          <div
            className={cn("relative w-full overflow-hidden", HEIGHT)}
            style={BACKDROP_HERO_MASK}
          >
            <AnimatePresence initial={false}>
              <Backdrop key={movie.id} movie={movie} priority={index === 0} />
            </AnimatePresence>
            <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/25 to-transparent" />
            <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/40 to-transparent" />
          </div>
        </HeroStage>
      </div>

      <div
        className={cn(
          CONTAINER_CLASS,
          "h-full justify-end pb-40 sm:pb-48 lg:pb-56",
        )}
      >
        <Drift>
          <div className="flex items-end justify-between gap-10">
            <ol
              className="flex min-w-0 flex-col"
              onKeyDown={onKeyDown}
              onPointerEnter={() => setTouched(true)}
              ref={list}
            >
              {movies.map((entry, position) => (
                <Row
                  active={position === index}
                  key={entry.id}
                  movie={entry}
                  onSelect={() => select(position)}
                  position={position}
                />
              ))}
            </ol>

            <div className="hidden w-64 shrink-0 lg:block">
              <AnimatePresence mode="wait">
                <motion.div
                  animate={{ filter: blur(0), opacity: 1, y: 0 }}
                  className="flex flex-col items-end gap-2 text-right"
                  exit={{
                    filter: blur(6),
                    opacity: 0,
                    transition: { duration: 0.3 },
                    y: -8,
                  }}
                  initial={{ filter: blur(6), opacity: 0, y: 10 }}
                  key={movie.id}
                  transition={{
                    delay: 0.1,
                    duration: span(1),
                    ease: EASE.expo,
                  }}
                >
                  <p className="text-[11px] font-semibold tracking-[0.18em] text-white/70 uppercase">
                    {movie.note}
                  </p>
                  <p className="text-sm text-white/60">
                    {[movie.year, ...movie.genres].filter(Boolean).join(" · ")}
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </Drift>
      </div>
    </section>
  );
}
