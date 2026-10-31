"use client";

import { useState, type JSX } from "react";
import { MoviePosterLink } from "@/features/movie";
import { Carousel, Header, Section, Swap } from "@/motion/stage";
import { Icon, SegmentedControl, TONE } from "@/ui";
import { compact, releaseDay } from "../lib/format";
import type { ShowingFilm } from "../lib/types";

type Shelf = "theatres" | "soon";

const ITEM =
  "w-[calc((100%-1.5rem)/3)] md:w-[calc((100%-2.25rem)/4)] lg:w-[calc((100%-3rem)/5)]";

function Caption({ film, shelf }: { film: ShowingFilm; shelf: Shelf }) {
  const date =
    shelf === "soon" && film.releaseDate ? releaseDay(film.releaseDate) : null;
  return (
    <span className="flex min-h-5 min-w-0 items-center gap-1.5 text-xs font-medium text-white/45 tabular-nums">
      {date ? <span className="text-white/70">{date}</span> : null}
      {film.waiting > 0 ? (
        <span className="inline-flex min-w-0 items-center gap-1 truncate">
          {date ? "·" : null}
          <Icon icon="solar:clock-circle-bold" size={12} />
          {compact(film.waiting)} want to see
        </span>
      ) : null}
    </span>
  );
}

// What TMDB says is in cinemas and on its way, with how many members are
// keeping each one on their watchlist.
export function HomeShowing({
  soon,
  theatres,
}: {
  soon: ShowingFilm[];
  theatres: ShowingFilm[];
}): JSX.Element | null {
  const [shelf, setShelf] = useState<Shelf>(
    theatres.length > 0 ? "theatres" : "soon",
  );
  const films = shelf === "theatres" ? theatres : soon;
  if (theatres.length + soon.length === 0) return null;

  const items = [
    ...(theatres.length > 0
      ? [{ key: "theatres" as const, label: "In theatres" }]
      : []),
    ...(soon.length > 0
      ? [{ key: "soon" as const, label: "Coming soon" }]
      : []),
  ];

  return (
    <Section className="flex w-full flex-col">
      <Header
        actions={
          items.length > 1 ? (
            <SegmentedControl
              ariaLabel="Showing"
              className={TONE.tabs}
              items={items}
              onChange={setShelf}
              value={shelf}
            />
          ) : null
        }
        icon="solar:clapperboard-play-bold"
        title="At the cinema"
      />
      <Swap id={shelf}>
        <Carousel
          arrowClassName={TONE.arrows}
          className="rounded-[16px]"
          itemClassName={ITEM}
          label={shelf === "theatres" ? "In theatres" : "Coming soon"}
          radius={16}
        >
          {films.map((film) => (
            <MoviePosterLink
              caption={<Caption film={film} shelf={shelf} />}
              key={film.id}
              movie={film}
              radius={16}
              sizes="(min-width: 1024px) 18vw, (min-width: 768px) 22vw, 30vw"
            />
          ))}
        </Carousel>
      </Swap>
    </Section>
  );
}
