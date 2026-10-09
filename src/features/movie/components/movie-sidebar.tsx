import { Suspense, type JSX, type ReactNode } from "react";
import { personHref } from "@/config/routes";
import { Tooltip } from "@/ui";
import type { Awards, MovieDetails } from "@/infrastructure/tmdb/types";
import {
  formatMoney,
  formatReleaseDate,
  getCertification,
  getOriginalLanguageName,
  getTags,
  getWriters,
} from "../lib/utils";
import {
  FACT_ROW_TYPE,
  SIDEBAR_CLASS,
  SIDEBAR_FACTS_CLASS,
} from "../lib/layout";
import { SCENE, factsGap, undoGap } from "../lib/motion";
import { Decode, Fade, Line, Sequence } from "../stage";
import { MoviePoster } from "./movie-artwork";
import { MovieSocialProof } from "@/features/social";
import { MovieAwardsAction } from "./movie-awards";
import { MovieCollectionActions } from "./movie-collection-actions";
import { FactLink } from "./movie-fact-link";
import { MoneyCount } from "./movie-motion";

const MAX_VISIBLE_PEOPLE = 2;
const MAX_VISIBLE_GENRES = 3;
const MAX_VISIBLE_TAGS = 2;

function Row({
  at,
  children,
  label,
  out,
}: {
  at: number;
  children: ReactNode;
  label: string;
  out: number;
}) {
  return (
    <div className="group/row relative flex items-baseline justify-between gap-6 py-3 first:pt-0 last:pb-0">
      <dt className="shrink-0 text-[11px] font-semibold tracking-[0.16em] text-white/50 uppercase">
        <Decode at={at} hover out={out}>
          {label}
        </Decode>
      </dt>
      <Fade
        as="dd"
        at={at + SCENE.facts.lag}
        className={`min-w-0 text-right ${FACT_ROW_TYPE} font-medium text-white tabular-nums`}
        out={out}
      >
        {children}
      </Fade>
      <Line
        at={at}
        className="absolute inset-x-0 bottom-0 bg-white/[0.06] group-last/row:hidden"
        out={out}
      />
    </div>
  );
}

interface Name {
  href?: string;
  text: string;
}

function Names({
  max,
  names,
  when,
}: {
  max: number;
  names: readonly Name[];
  when: When;
}) {
  const visible = names.slice(0, max);
  const hidden = names.slice(max);
  return (
    <>
      {visible.map((name, index) => {
        const text = (
          <Decode at={when.at} hover out={when.out}>
            {name.text}
          </Decode>
        );
        return (
          <span key={`${name.text}-${index}`}>
            {name.href ? (
              <FactLink href={name.href} label={name.text}>
                {text}
              </FactLink>
            ) : (
              text
            )}
            {index < visible.length - 1 ? (
              <Fade as="span" at={when.at} out={when.out}>
                {", "}
              </Fade>
            ) : null}
          </span>
        );
      })}
      {hidden.length > 0 ? (
        <Tooltip
          position="top"
          text={hidden.map((name) => name.text).join(", ")}
        >
          <span className="ml-1.5 cursor-help text-xs font-bold text-white/70">
            +{hidden.length}
          </span>
        </Tooltip>
      ) : null}
    </>
  );
}

function Text({ children, when }: { children: string; when: When }) {
  return (
    <Decode at={when.at} hover out={when.out}>
      {children}
    </Decode>
  );
}

const asName = (person: { id: number; name: string }): Name => ({
  href: personHref(person.id),
  text: person.name,
});

const capitalize = (text: string) =>
  text.replace(
    /(^|\s)(\S)/g,
    (_, space: string, letter: string) => `${space}${letter.toUpperCase()}`,
  );

interface When {
  at: number;
  out: number;
}

interface Fact {
  label: string;
  value: (when: When) => ReactNode;
}

export function MovieSidebar({
  awards,
  movie,
}: {
  awards: Promise<Awards | null>;
  movie: MovieDetails;
}): JSX.Element {
  const writers = getWriters(movie);
  const certification = getCertification(movie);
  const language = getOriginalLanguageName(movie);
  const released = formatReleaseDate(movie.releaseDate);
  const budget = formatMoney(movie.budget);
  const revenue = formatMoney(movie.revenue);
  const tags = getTags(movie);
  const genres = movie.genres.map((genre) => genre.name);
  const hasProviders = Object.keys(movie.watchProviders).length > 0;

  const facts: Fact[] = [];
  if (genres.length > 0) {
    facts.push({
      label: genres.length > 1 ? "Genres" : "Genre",
      value: (when) => (
        <Names
          max={MAX_VISIBLE_GENRES}
          names={genres.map((text) => ({ text }))}
          when={when}
        />
      ),
    });
  }
  if (tags.length > 0) {
    facts.push({
      label: "Tags",
      value: (when) => (
        <Names
          max={MAX_VISIBLE_TAGS}
          names={tags.map((tag) => ({ text: capitalize(tag) }))}
          when={when}
        />
      ),
    });
  }
  if (writers.length > 0) {
    facts.push({
      label: writers.length > 1 ? "Writers" : "Writer",
      value: (when) => (
        <Names
          max={MAX_VISIBLE_PEOPLE}
          names={writers.map(asName)}
          when={when}
        />
      ),
    });
  }
  if (released) {
    facts.push({
      label: "Released",
      value: (when) => <Text when={when}>{released}</Text>,
    });
  }
  if (certification) {
    facts.push({
      label: "Rated",
      value: (when) => <Text when={when}>{certification}</Text>,
    });
  }
  if (language) {
    facts.push({
      label: "Language",
      value: (when) => <Text when={when}>{language}</Text>,
    });
  }
  if (movie.status !== "Unknown") {
    facts.push({
      label: "Status",
      value: (when) => <Text when={when}>{movie.status}</Text>,
    });
  }
  if (budget) {
    facts.push({
      label: "Budget",
      value: (when) => <MoneyCount at={when.at} value={movie.budget ?? 0} />,
    });
  }
  if (revenue) {
    facts.push({
      label: "Revenue",
      value: (when) => <MoneyCount at={when.at} value={movie.revenue ?? 0} />,
    });
  }

  const gap = factsGap(facts.length);
  const outGap = undoGap(facts.length);

  return (
    <Sequence className={SIDEBAR_CLASS}>
      <div className="flex min-w-0 flex-col gap-3" data-exit="">
        <MoviePoster awards={awards} movie={movie} />
        <MovieCollectionActions
          hasProviders={hasProviders}
          movieId={movie.id}
          title={movie.title}
        >
          <Suspense fallback={null}>
            <MovieAwardsAction awards={awards} order={4} />
          </Suspense>
        </MovieCollectionActions>
        <MovieSocialProof movieId={movie.id} title={movie.title} />
      </div>

      <div className={SIDEBAR_FACTS_CLASS} data-flow="">
        <dl className="flex flex-col" data-exit="">
          {facts.map((fact, index) => {
            const at = SCENE.facts.at + index * gap;
            const out = index * outGap;
            return (
              <Row at={at} key={fact.label} label={fact.label} out={out}>
                {fact.value({ at: at + SCENE.facts.lag, out })}
              </Row>
            );
          })}
        </dl>
      </div>
    </Sequence>
  );
}
