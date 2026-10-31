import type { JSX } from "react";
import { AccountLink } from "@/features/account";
import { MoviePosterLink } from "@/features/movie";
import { Header, Item, Section } from "@/motion/stage";
import { TONE } from "@/ui";
import { movieHref } from "@/config/routes";
import type { RisingFilm } from "../lib/types";

// Films members are suddenly logging, against their own usual week.
export function HomeRising({
  films,
}: {
  films: RisingFilm[];
}): JSX.Element | null {
  if (films.length === 0) return null;
  return (
    <Section className="flex w-full flex-col">
      <Header icon="solar:graph-up-bold" title="Rising on Guffin" />
      <ol
        className={`-my-4 grid grid-cols-1 gap-x-12 divide-y ${TONE.rules} sm:grid-cols-2 sm:divide-y-0 sm:[&>li]:border-b sm:[&>li]:border-white/[0.06] sm:[&>li:nth-last-child(-n+2)]:border-b-0`}
      >
        {films.map((film, index) => (
          <Item
            as="li"
            className="flex items-center gap-4 py-4"
            from="light"
            key={film.id}
          >
            <span className="font-zuume w-9 shrink-0 text-right text-4xl leading-none font-bold text-white/20 tabular-nums">
              {index + 1}
            </span>
            <div className="w-11 shrink-0">
              <MoviePosterLink movie={film} radius={8} sizes="44px" />
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <AccountLink
                className="truncate text-[15px] font-semibold text-white underline decoration-transparent hover:decoration-current"
                href={movieHref(film.id)}
              >
                {film.title}
              </AccountLink>
              <span className="truncate text-xs text-white/45 tabular-nums">
                {[film.year, `${film.week} members this week`]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </div>
            <span
              className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums ${TONE.chosen}`}
              title="Members this week against its usual week"
            >
              {film.lift.toFixed(1)}×
            </span>
          </Item>
        ))}
      </ol>
    </Section>
  );
}
