"use client";

import {
  useCallback,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import {
  useDockActionClass,
  useDockActions,
} from "@omerdlw/base-framework/modules/dock";
import { ACTION_TONE_CLASS } from "@omerdlw/base-framework/tokens";
import { cn } from "@omerdlw/base-framework/utils";
import { MoviePosterLink, movieHref } from "@/features/movie";
import { PersonResultRow, personHref } from "@/features/person";
import { Button, Icon, Input, SegmentedControl, Skeleton } from "@/ui";
import {
  SEARCH_MAX_QUERY_LENGTH,
  SEARCH_NOUNS,
  SEARCH_OVERVIEW,
  SEARCH_PER_PAGE,
  SEARCH_SCOPE_ITEMS,
} from "../lib/constants";
import { emptyResults, useSearch } from "../lib/hooks";
import type { SearchResults, SearchScope } from "../lib/types";
import { listHref, reviewHref, userHref } from "../lib/utils";
import { ListResultRow } from "./list-result-row";
import { ReviewResultRow } from "./review-result-row";
import { UserResultRow } from "./user-result-row";

const MESSAGE_CLASS = "px-1 py-2 text-center text-sm text-white/50";

function pageOf(
  scope: SearchScope,
  results: SearchResults | null,
  page: number,
): { page: number; pages: number; slices: SearchResults } {
  const all = results ?? emptyResults();

  if (scope === "all") {
    const slices = emptyResults();
    for (const kind of Object.keys(slices) as (keyof SearchResults)[]) {
      Object.assign(slices, {
        [kind]: all[kind].slice(0, SEARCH_OVERVIEW[kind]),
      });
    }
    return { page: 0, pages: 1, slices };
  }

  const perPage = SEARCH_PER_PAGE[scope];
  const pages = Math.max(1, Math.ceil(all[scope].length / perPage));
  const safe = Math.min(page, pages - 1);
  const from = safe * perPage;
  const slices = emptyResults();
  Object.assign(slices, { [scope]: all[scope].slice(from, from + perPage) });
  return { page: safe, pages, slices };
}

function firstHref(slices: SearchResults): string | null {
  const movie = slices.movies[0];
  if (movie) return movieHref(movie.id);
  const person = slices.people[0];
  if (person) return personHref(person.id);
  const user = slices.users[0];
  if (user) return userHref(user.username);
  const list = slices.lists[0];
  if (list) return listHref(list.owner.username, list.slug);
  const review = slices.reviews[0];
  return review ? reviewHref(review.tmdbId, review.author.username) : null;
}

function PagerButton({
  direction,
  onClick,
}: {
  direction: "next" | "previous";
  onClick: () => void;
}) {
  const actionClass = useDockActionClass();
  return (
    <Button
      aria-label={direction === "next" ? "Next page" : "Previous page"}
      className={actionClass({ className: "size-10 shrink-0 px-0" })}
      onClick={onClick}
      type="button"
    >
      <Icon
        icon={
          direction === "next"
            ? "solar:alt-arrow-right-linear"
            : "solar:alt-arrow-left-linear"
        }
        size={16}
      />
    </Button>
  );
}

export function SearchAction({
  autoFocus = false,
  onClose,
}: {
  autoFocus?: boolean;
  onClose?: () => void;
} = {}) {
  const { navigate } = useDockActions();
  const actionClass = useDockActionClass();
  const [scope, setScope] = useState<SearchScope>("all");
  const [page, setPage] = useState(0);
  const search = useSearch(scope);
  const { clear, failure, input, isLoading, query, results, retry } = search;

  const visible = pageOf(scope, results, page);
  const { slices } = visible;
  const hitCount =
    slices.movies.length +
    slices.people.length +
    slices.users.length +
    slices.lists.length +
    slices.reviews.length;
  const showSkeleton = isLoading && hitCount === 0;
  const showEmpty = !isLoading && !failure && query !== "" && hitCount === 0;

  const { setInput } = search;
  const handleInput = useCallback(
    (value: string) => {
      setInput(value);
      setPage(0);
    },
    [setInput],
  );

  const handleScope = useCallback((next: SearchScope) => {
    setScope(next);
    setPage(0);
  }, []);

  const handleClear = useCallback(() => {
    clear();
    setPage(0);
  }, [clear]);

  const handleSubmit = useCallback(
    (event: FormEvent) => {
      event.preventDefault();
      const href = firstHref(slices);
      if (!href || isLoading) return;
      void navigate(href).then((committed) => {
        if (committed) handleClear();
      });
    },
    [handleClear, isLoading, navigate, slices],
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key !== "Escape") return;
      if (input) {
        event.stopPropagation();
        handleClear();
      } else if (onClose) {
        event.stopPropagation();
        onClose();
      }
    },
    [handleClear, input, onClose],
  );

  const hasPrevious = visible.page > 0;
  const hasNext = visible.page < visible.pages - 1;
  const resultKey = `${scope}:${query}:${visible.page}`;
  const hasOutput =
    showSkeleton || hitCount > 0 || showEmpty || Boolean(failure);

  return (
    <div className="flex w-full flex-col">
      <div className="flex w-full items-center gap-2.5">
        {hasPrevious ? (
          <PagerButton
            direction="previous"
            onClick={() => setPage(visible.page - 1)}
          />
        ) : null}

        <form
          className="relative min-w-0 flex-1"
          onSubmit={handleSubmit}
          role="search"
        >
          <Icon
            className={cn(
              "pointer-events-none absolute top-1/2 left-4 -translate-y-1/2",
              input ? "text-white" : "text-white/50",
            )}
            icon="solar:magnifer-linear"
            size={16}
          />
          <Input
            aria-label="Search movies, people, users, lists and reviews"
            autoFocus={autoFocus}
            autoCapitalize="off"
            autoComplete="off"
            autoCorrect="off"
            className="h-10 rounded-[20px] bg-white/5 pr-10 pl-11 text-sm text-white placeholder:text-white/50 hover:bg-white/10 focus:bg-white/10 focus:outline-none"
            enterKeyHint="search"
            maxLength={SEARCH_MAX_QUERY_LENGTH}
            name="search"
            onChange={(event) => handleInput(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search movies, people, users, lists..."
            spellCheck={false}
            type="text"
            value={input}
          />
          <div className="absolute top-1/2 right-3 -translate-y-1/2">
            {isLoading ? (
              <Icon
                aria-label="Searching"
                className="text-white/70"
                icon="line-md:loading-loop"
                size={16}
              />
            ) : input ? (
              <Button
                aria-label="Clear search"
                className="center size-6 cursor-pointer text-white/50 hover:text-white"
                onClick={handleClear}
              >
                <Icon icon="material-symbols:close-rounded" size={16} />
              </Button>
            ) : null}
          </div>
        </form>

        {hasNext ? (
          <PagerButton
            direction="next"
            onClick={() => setPage(visible.page + 1)}
          />
        ) : null}
      </div>

      <>
        {query ? (
          <SegmentedControl
            ariaLabel="Search for"
            className="mt-2.5"
            fill
            items={SEARCH_SCOPE_ITEMS}
            onChange={handleScope}
            value={scope}
          />
        ) : null}
      </>

      <div
        aria-live="polite"
        className={cn("flex flex-col gap-2.5", hasOutput && "mt-2.5")}
      >
        {showSkeleton ? (
          <div aria-hidden="true" className="flex flex-col gap-2.5">
            {scope === "all" || scope === "movies" ? (
              <div className="grid grid-cols-4 gap-2.5">
                {Array.from(
                  {
                    length:
                      scope === "all"
                        ? SEARCH_OVERVIEW.movies
                        : SEARCH_PER_PAGE.movies,
                  },
                  (_, index) => (
                    <Skeleton
                      className="aspect-[2/3] w-full rounded-[20px]"
                      key={index}
                    />
                  ),
                )}
              </div>
            ) : null}
            {scope !== "movies"
              ? Array.from(
                  { length: scope === "all" ? 3 : SEARCH_PER_PAGE[scope] },
                  (_, index) => (
                    <Skeleton
                      className="h-14 w-full rounded-[20px]"
                      key={index}
                    />
                  ),
                )
              : null}
          </div>
        ) : null}

        <>
          {hitCount > 0 ? (
            <div className="flex flex-col gap-2.5" key={resultKey}>
              {slices.movies.length > 0 ? (
                <ul className="grid grid-cols-4 gap-2.5">
                  {slices.movies.map((hit) => (
                    <li className="min-w-0" key={hit.id}>
                      <MoviePosterLink
                        caption={false}
                        movie={hit}
                        onNavigated={handleClear}
                        sizes="110px"
                      />
                    </li>
                  ))}
                </ul>
              ) : null}

              <ul className="flex flex-col gap-1">
                {slices.people.map((hit) => (
                  <li key={`person:${hit.id}`}>
                    <PersonResultRow onNavigated={handleClear} person={hit} />
                  </li>
                ))}
                {slices.users.map((hit) => (
                  <li key={`user:${hit.id}`}>
                    <UserResultRow onNavigated={handleClear} user={hit} />
                  </li>
                ))}
                {slices.lists.map((hit) => (
                  <li key={`list:${hit.id}`}>
                    <ListResultRow list={hit} onNavigated={handleClear} />
                  </li>
                ))}
                {slices.reviews.map((hit) => (
                  <li key={`review:${hit.id}`}>
                    <ReviewResultRow onNavigated={handleClear} review={hit} />
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </>

        {showEmpty ? (
          <p className={MESSAGE_CLASS}>
            No {SEARCH_NOUNS[scope]} found for “{query}”
          </p>
        ) : null}

        {failure ? (
          <div className="flex flex-col items-center gap-2.5">
            <p className={MESSAGE_CLASS}>{failure.message}</p>
            {failure.code !== "invalid_query" ? (
              <Button
                className={actionClass({
                  className: "h-10",
                  variant: ACTION_TONE_CLASS,
                })}
                onClick={retry}
              >
                Try again
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
