"use client";

import type { JSX } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { movieHref } from "@config/routes";
import { tmdbImageUrl } from "@/infrastructure/tmdb/images";
import { formatWeek, rankLabel } from "../lib/format";
import type { HomeFeed, TrendingMovie } from "../lib/types";
import {
  CreditTitle,
  MONO,
  OpenFilm,
  creditLine,
  usePresenceDirection,
} from "./credits";

interface NowShowingProps {
  active: number;
  direction: number;
  films: TrendingMovie[];
  plain: boolean;
  week: HomeFeed["week"];
}

// Everything around the screen. It lines up with the screen's edges, which
// the opening writes into --screen-* as it lays the room out.
export function NowShowing({
  active,
  direction,
  films,
  plain,
  week,
}: NowShowingProps): JSX.Element {
  const film = films[active] ?? films[0]!;
  const plainSrc = plain
    ? tmdbImageUrl("backdrop", film.backdropPath, "w1280")
    : null;

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
        <span className="shrink-0 text-white/35 tabular-nums">
          <span className="text-white/85">{rankLabel(active + 1)}</span>
          {" / "}
          {rankLabel(films.length)}
        </span>
      </header>

      <div
        className="absolute grid"
        style={{
          left: "var(--screen-left)",
          right: "var(--screen-right)",
          top: "calc(100% - var(--screen-bottom) + clamp(1.25rem, 3.6svh, 2.5rem))",
        }}
      >
        <AnimatePresence custom={direction} initial={false}>
          <Credits
            key={film.id}
            direction={direction}
            film={film}
            rank={active + 1}
          />
        </AnimatePresence>
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
    </>
  );
}

function Credits({
  direction,
  film,
  rank,
}: {
  direction: number;
  film: TrendingMovie;
  rank: number;
}): JSX.Element {
  const way = usePresenceDirection(direction);

  return (
    <motion.article
      animate="show"
      className="grid min-w-0 gap-x-12 gap-y-4 [grid-area:1/1] lg:grid-cols-[minmax(0,1fr)_minmax(0,21rem)] lg:items-end"
      custom={way}
      exit="leave"
      initial="enter"
    >
      <div className="min-w-0">
        <motion.p
          className={`mb-3 flex flex-wrap gap-x-4 gap-y-1 text-white/45 sm:mb-4 ${MONO}`}
          custom={way}
          variants={creditLine}
        >
          <span className="text-white/85">No. {rankLabel(rank)}</span>
          {film.year ? <span>{film.year}</span> : null}
          {film.genres.length > 0 ? (
            <span>{film.genres.join(" · ")}</span>
          ) : null}
        </motion.p>

        <CreditTitle
          className="font-zuume text-[clamp(2.75rem,5vw,5.75rem)] leading-[0.9] text-balance text-white uppercase"
          direction={way}
          title={film.title}
        />
      </div>

      <motion.div
        className="flex min-w-0 flex-col items-start gap-4 lg:pb-[0.35em]"
        custom={way}
        variants={creditLine}
      >
        {film.logline ? (
          <p className="line-clamp-2 font-martina text-[clamp(1rem,1.15vw,1.175rem)] leading-snug text-white/60 italic lg:line-clamp-3">
            {film.logline}
          </p>
        ) : null}
        <OpenFilm id={film.id} />
      </motion.div>
    </motion.article>
  );
}
