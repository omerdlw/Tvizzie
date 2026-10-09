"use client";

import { useState, type JSX } from "react";
import Link from "next/link";
import { cn } from "@omerdlw/base-framework/utils";
import { movieHref } from "@/config/routes";
import { AdaptiveImage } from "@/ui";
import {
  CascadeItem,
  Section,
  SectionPart,
  TabSwap,
  useDockLinkClick,
} from "@/motion";
import { tmdbImageUrl } from "@/infrastructure/tmdb/images";
import type { HomeMovie } from "../lib/types";
import { peek } from "./pointer-poster";

type Board = "theatres" | "soon";

const BOARDS: readonly { key: Board; label: string; note: string }[] = [
  { key: "theatres", label: "Now showing", note: "In cinemas this week" },
  { key: "soon", label: "Coming soon", note: "Opening in the weeks ahead" },
];

const DATE = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

const dateOf = (date: string | null) =>
  date ? DATE.format(new Date(`${date}T00:00:00Z`)) : "";

function Line({ movie }: { movie: HomeMovie }): JSX.Element {
  const href = movieHref(movie.id);
  const onClick = useDockLinkClick(href);
  const show = () =>
    peek.show({
      id: movie.id,
      posterPath: movie.posterPath,
      title: movie.title,
    });

  return (
    <CascadeItem
      as="li"
      className="border-b border-white/[0.07] first:border-t"
    >
      <Link
        className="group/line flex items-center gap-4 py-3.5 outline-none"
        href={href}
        onBlur={peek.hide}
        onClick={onClick}
        onFocus={show}
        onPointerEnter={show}
        onPointerLeave={peek.hide}
        prefetch={false}
      >
        <span className="w-14 shrink-0 font-zuume text-xl leading-none font-bold text-white/35 uppercase tabular-nums sm:w-16 sm:text-2xl">
          {dateOf(movie.releaseDate)}
        </span>
        <span className="hidden h-12 w-8 shrink-0 overflow-hidden rounded-[8px] bg-white/5 [@media(hover:none)]:block">
          <AdaptiveImage
            alt=""
            className="object-cover"
            sizes="32px"
            src={tmdbImageUrl("poster", movie.posterPath, "w92")}
            wrapperClassName="absolute inset-0"
          />
        </span>
        <span className="cine-fade min-w-0 flex-1 truncate font-zuume text-3xl leading-none font-bold text-white/85 uppercase transition-transform duration-slow ease-out-expo group-hover/line:translate-x-2 group-hover/line:text-white group-focus-visible/line:translate-x-2 group-focus-visible/line:text-white sm:text-4xl">
          {movie.title}
        </span>
        <span className="hidden shrink-0 text-xs text-white/40 md:block">
          {movie.genres.slice(0, 2).join(" · ")}
        </span>
      </Link>
    </CascadeItem>
  );
}

export function Showtimes({
  soon,
  theatres,
}: {
  soon: readonly HomeMovie[];
  theatres: readonly HomeMovie[];
}): JSX.Element | null {
  const available = BOARDS.filter(
    (board) => (board.key === "soon" ? soon : theatres).length > 0,
  );
  const [chosen, setChosen] = useState<Board>("theatres");
  if (available.length === 0) return null;

  const board = available.some((entry) => entry.key === chosen)
    ? chosen
    : available[0].key;
  const films = board === "soon" ? soon : theatres;
  const note = BOARDS.find((entry) => entry.key === board)?.note;

  return (
    <Section className="grid w-full gap-8 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] lg:gap-16">
      <SectionPart className="flex flex-col gap-4 lg:sticky lg:top-24 lg:self-start">
        <div
          aria-label="Cinema board"
          className="flex flex-wrap gap-x-6 gap-y-1 lg:flex-col"
          role="tablist"
        >
          {available.map((entry) => (
            <button
              aria-selected={entry.key === board}
              className={cn(
                "cine-fade cursor-pointer text-left font-zuume text-5xl leading-[0.9] font-bold uppercase outline-none sm:text-6xl lg:text-7xl",
                entry.key === board
                  ? "text-white"
                  : "text-transparent [-webkit-text-stroke:1.5px_rgb(255_255_255/0.3)] hover:[-webkit-text-stroke-color:rgb(255_255_255/0.65)] focus-visible:[-webkit-text-stroke-color:rgb(255_255_255/0.65)]",
              )}
              key={entry.key}
              onClick={() => setChosen(entry.key)}
              role="tab"
              type="button"
            >
              {entry.label}
            </button>
          ))}
        </div>
        <p className="text-sm text-white/50">{note}</p>
      </SectionPart>

      <div
        onPointerEnter={(event) => {
          if (event.pointerType === "mouse") {
            peek.warm(films.map((movie) => movie.posterPath));
          }
        }}
      >
        <TabSwap as="ul" id={board} stagger={0.045}>
          {films.map((movie) => (
            <Line key={movie.id} movie={movie} />
          ))}
        </TabSwap>
      </div>
    </Section>
  );
}
