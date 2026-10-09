import type { JSX } from "react";
import { MoviePosterLink } from "@/features/movie";
import { Cascade, CascadeItem, Section } from "@/motion";
import { PULSE_MINIMUM } from "../lib/constants";
import type { PulseMovie } from "../lib/types";
import { Heading } from "./heading";

function tally(movie: PulseMovie): string {
  const parts: string[] = [];
  if (movie.watchers > 0) parts.push(`${movie.watchers} watched`);
  if (movie.likers > 0) parts.push(`${movie.likers} liked`);
  if (movie.reviewers > 0) {
    parts.push(
      `${movie.reviewers} ${movie.reviewers === 1 ? "review" : "reviews"}`,
    );
  }
  if (parts.length === 0 && movie.listers > 0) {
    parts.push(`${movie.listers} want to watch`);
  }
  return parts.join(" · ");
}

function Tally({
  large,
  movie,
}: {
  large: boolean;
  movie: PulseMovie;
}): JSX.Element {
  return (
    <span
      className={`cine-fade pointer-events-none absolute inset-x-0 bottom-0 z-10 flex flex-col gap-1 bg-gradient-to-t from-black/85 via-black/40 to-transparent px-3 pt-14 pb-3 group-focus-visible/media:opacity-100 group-hover/media:opacity-100 [@media(hover:none)]:opacity-100 ${
        large ? "opacity-100" : "opacity-0"
      }`}
    >
      {large ? (
        <span className="font-zuume text-3xl leading-[0.9] font-bold text-white uppercase">
          {movie.title}
        </span>
      ) : null}
      <span className="text-[11px] leading-4 font-semibold text-white/80">
        {tally(movie)}
      </span>
    </span>
  );
}

export function Pulse({
  movies,
}: {
  movies: readonly PulseMovie[];
}): JSX.Element | null {
  if (movies.length < PULSE_MINIMUM) return null;

  return (
    <Section className="flex w-full flex-col gap-8">
      <Heading kicker="Picked by the people here">This week on Tvizzie</Heading>
      <Cascade className="grid grid-cols-3 gap-3 lg:grid-cols-6" stagger={0.06}>
        {movies.map((movie, position) => {
          const large = position === 0;
          return (
            <CascadeItem
              className={large ? "col-span-2 row-span-2" : undefined}
              from={large ? "scale" : "up"}
              key={movie.id}
            >
              <MoviePosterLink
                caption={false}
                movie={{
                  id: movie.id,
                  posterPath: movie.posterPath,
                  title: movie.title,
                  year: movie.year,
                }}
                overlay={<Tally large={large} movie={movie} />}
                sizes={
                  large
                    ? "(min-width: 1024px) 33vw, 66vw"
                    : "(min-width: 1024px) 16vw, 30vw"
                }
              />
            </CascadeItem>
          );
        })}
      </Cascade>
    </Section>
  );
}
