"use client";

import {
  useId,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { LayoutGroup } from "motion/react";
import {
  useDockActionClass,
  useDockActions,
} from "@omerdlw/base-framework/modules/dock";
import { ACTION_TONE_CLASS } from "@omerdlw/base-framework/tokens";
import { cn } from "@omerdlw/base-framework/utils";
import { MoviePosterLink, MoviePosterPlaceholder } from "@/features/movie";
import { PersonResultRow } from "@/features/person";
import { Button, Icon, Input, SegmentedControl, SkeletonBlock } from "@/ui";
import { SlidingHighlight } from "@/ui/sliding-highlight";
import {
  SEARCH_EMPTY_HINTS,
  SEARCH_GROUP_LABELS,
  SEARCH_MAX_QUERY_LENGTH,
  SEARCH_NOUNS,
  SEARCH_OVERVIEW,
  SEARCH_PER_PAGE,
  SEARCH_SCOPE_ITEMS,
} from "../lib/constants";
import { useSearch } from "../lib/hooks";
import { arrange, hrefsOf, type SearchSection } from "../lib/overview";
import type { SearchScope } from "../lib/types";
import { ListResultRow } from "./list-result-row";
import { ReviewResultRow } from "./review-result-row";
import { UserResultRow } from "./user-result-row";

const POSTER_GRID = "grid grid-cols-4 gap-2.5";
const ROW_LIST = "flex flex-col gap-1";

function Option({
  active,
  children,
  className,
  id,
  onPointerEnter,
}: {
  active: boolean;
  children: ReactNode;
  className?: string;
  id: string;
  onPointerEnter: () => void;
}) {
  return (
    <li
      aria-selected={active}
      className={cn("relative isolate min-w-0", className)}
      data-active={active ? "" : undefined}
      id={id}
      onPointerEnter={onPointerEnter}
      role="option"
    >
      {active ? (
        <SlidingHighlight
          className="rounded-[16px] bg-white/[0.07]"
          layoutId="search-result-highlight"
        />
      ) : null}
      <span className="relative z-10 block min-w-0">{children}</span>
    </li>
  );
}

function Spacers({ count, kind }: { count: number; kind: "poster" | "row" }) {
  if (count <= 0) return null;
  return Array.from({ length: count }, (_, index) =>
    kind === "poster" ? (
      <li aria-hidden="true" className="invisible min-w-0" inert key={index}>
        <MoviePosterPlaceholder />
      </li>
    ) : (
      <li aria-hidden="true" className="h-16" key={index} />
    ),
  );
}

function rowsOf(
  section: Exclude<SearchSection, { kind: "movies" }>,
  onNavigated: () => void,
  query: string,
): { key: string | number; node: ReactNode }[] {
  switch (section.kind) {
    case "people":
      return section.hits.map((hit) => ({
        key: hit.id,
        node: (
          <PersonResultRow
            onNavigated={onNavigated}
            person={hit}
            query={query}
          />
        ),
      }));
    case "users":
      return section.hits.map((hit) => ({
        key: hit.id,
        node: (
          <UserResultRow onNavigated={onNavigated} query={query} user={hit} />
        ),
      }));
    case "lists":
      return section.hits.map((hit) => ({
        key: hit.id,
        node: (
          <ListResultRow list={hit} onNavigated={onNavigated} query={query} />
        ),
      }));
    case "reviews":
      return section.hits.map((hit) => ({
        key: hit.id,
        node: (
          <ReviewResultRow
            onNavigated={onNavigated}
            query={query}
            review={hit}
          />
        ),
      }));
  }
}

function Section({
  active,
  onNavigated,
  onOptionPointerEnter,
  optionId,
  query,
  section,
  spacers,
  start,
}: {
  active: number;
  onNavigated: () => void;
  onOptionPointerEnter: (index: number) => void;
  optionId: (index: number) => string;
  query: string;
  section: SearchSection;
  spacers: number;
  start: number;
}) {
  const label = SEARCH_GROUP_LABELS[section.kind];
  const option = (
    offset: number,
    children: ReactNode,
    key: string | number,
  ) => (
    <Option
      active={start + offset === active}
      id={optionId(start + offset)}
      key={key}
      onPointerEnter={() => onOptionPointerEnter(start + offset)}
    >
      {children}
    </Option>
  );

  if (section.kind === "movies") {
    return (
      <ul aria-label={label} className={POSTER_GRID} role="group">
        {section.hits.map((hit, offset) =>
          option(
            offset,
            <MoviePosterLink
              detail={hit.originalTitle}
              movie={hit}
              onNavigated={onNavigated}
              radius={12}
              sizes="110px"
            />,
            hit.id,
          ),
        )}
        <Spacers count={spacers} kind="poster" />
      </ul>
    );
  }

  const rows = rowsOf(section, onNavigated, query).map(
    ({ key, node }, offset) => option(offset, node, key),
  );

  return (
    <ul aria-label={label} className={ROW_LIST} role="group">
      {rows}
      <Spacers count={spacers} kind="row" />
    </ul>
  );
}

function ResultsSkeleton({ scope }: { scope: SearchScope }) {
  const posters =
    scope === "all"
      ? SEARCH_OVERVIEW.movies
      : scope === "movies"
        ? SEARCH_PER_PAGE.movies
        : 0;
  const rows =
    scope === "all" ? 2 : scope === "movies" ? 0 : SEARCH_PER_PAGE[scope];

  return (
    <div aria-hidden="true" className="flex flex-col gap-2.5">
      {posters > 0 ? (
        <div className={POSTER_GRID}>
          {Array.from({ length: posters }, (_, index) => (
            <SkeletonBlock
              className="aspect-[2/3] w-full rounded-[12px]"
              key={index}
            />
          ))}
        </div>
      ) : null}
      {rows > 0 ? (
        <div className={ROW_LIST}>
          {Array.from({ length: rows }, (_, index) => (
            <div className="flex h-16 items-center gap-3 p-2" key={index}>
              <SkeletonBlock className="h-12 w-8 shrink-0 rounded-[8px]" />
              <div className="flex flex-1 flex-col gap-2">
                <SkeletonBlock className="h-3.5 w-1/2 rounded-full" />
                <SkeletonBlock className="h-3 w-3/4 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function PagerButton({
  direction,
  disabled,
  onClick,
}: {
  direction: "next" | "previous";
  disabled: boolean;
  onClick: () => void;
}) {
  const actionClass = useDockActionClass();
  return (
    <Button
      aria-label={direction === "next" ? "Next page" : "Previous page"}
      className={actionClass({
        className:
          "size-8 shrink-0 px-0 disabled:pointer-events-none disabled:opacity-30",
      })}
      disabled={disabled}
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
  const listId = useId();
  const [scope, setScope] = useState<SearchScope>("all");
  const [page, setPage] = useState(0);
  const [cursor, setCursor] = useState<{
    key: string;
    index: number;
    source: "keyboard" | "pointer";
  } | null>(null);
  const { clear, failure, input, isLoading, query, results, retry, setInput } =
    useSearch(scope);

  const view = arrange(scope, results, page);
  const hrefs = view.sections.flatMap(hrefsOf);
  const hitCount = hrefs.length;
  const viewKey = `${scope}:${query}:${view.page}`;
  const active = cursor?.key === viewKey ? cursor.index : -1;
  const optionId = (index: number) => `${listId}-option-${index}`;

  const showSkeleton = isLoading && hitCount === 0;
  const showEmpty = !isLoading && !failure && query !== "" && hitCount === 0;
  const hasOutput =
    showSkeleton || hitCount > 0 || showEmpty || Boolean(failure);

  const handleInput = (value: string) => {
    setInput(value);
    setPage(0);
  };

  const handleScope = (next: SearchScope) => {
    setScope(next);
    setPage(0);
  };

  const handleClear = () => {
    clear();
    setPage(0);
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const href = hrefs[Math.max(active, 0)];
    if (!href || (isLoading && active < 0)) return;
    void navigate(href).then((committed) => {
      if (committed) handleClear();
    });
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing) return;

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      if (hitCount === 0) return;
      event.preventDefault();
      const next =
        event.key === "ArrowDown"
          ? Math.min(active + 1, hitCount - 1)
          : Math.max(active - 1, -1);
      setCursor({ index: next, key: viewKey, source: "keyboard" });
      return;
    }

    if (event.key !== "Escape") return;
    if (active >= 0) {
      event.stopPropagation();
      setCursor(null);
    } else if (input) {
      event.stopPropagation();
      handleClear();
    } else if (onClose) {
      event.stopPropagation();
      onClose();
    }
  };

  const hasPager = scope !== "all" && view.pages > 1;
  const from = view.page * view.perPage + 1;
  const to = Math.min(from + view.perPage - 1, view.total);

  const starts = view.sections.map((_, index) =>
    view.sections
      .slice(0, index)
      .reduce((count, section) => count + section.hits.length, 0),
  );
  const sections = view.sections.map((section, index) => (
    <Section
      active={active}
      key={section.kind}
      onNavigated={handleClear}
      onOptionPointerEnter={(index) =>
        setCursor({ index, key: viewKey, source: "pointer" })
      }
      optionId={optionId}
      query={query}
      section={section}
      spacers={hasPager ? view.perPage - section.hits.length : 0}
      start={starts[index]}
    />
  ));

  return (
    <div className="flex w-full flex-col">
      <form className="relative w-full" onSubmit={handleSubmit} role="search">
        <Icon
          className={cn(
            "pointer-events-none absolute top-1/2 left-4 -translate-y-1/2",
            input ? "text-white" : "text-white/50",
          )}
          icon="solar:magnifer-linear"
          size={16}
        />
        <Input
          aria-activedescendant={active >= 0 ? optionId(active) : undefined}
          aria-autocomplete="list"
          aria-controls={listId}
          aria-expanded={hitCount > 0}
          aria-label="Search movies, people, users, lists and reviews"
          autoFocus={autoFocus}
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
          className="h-10 rounded-[16px] bg-white/[0.06] pr-10 pl-11 text-sm text-white ring-1 ring-inset ring-white/[0.04] placeholder:text-white/40 hover:bg-white/10 focus:bg-white/10 focus:ring-white/[0.12] focus:outline-none"
          enterKeyHint="search"
          maxLength={SEARCH_MAX_QUERY_LENGTH}
          name="search"
          onChange={(event) => handleInput(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search movies, people, users, lists…"
          role="combobox"
          spellCheck={false}
          type="text"
          value={input}
        />
        <div className="absolute top-1/2 right-2 -translate-y-1/2">
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
              className="ui-iris center relative size-6 cursor-pointer rounded-full text-white/50 hover:text-white"
              onClick={handleClear}
            >
              <Icon icon="material-symbols:close-rounded" size={16} />
            </Button>
          ) : null}
        </div>
      </form>

      {query ? (
        <SegmentedControl
          ariaLabel="Search for"
          className="mt-2.5"
          round
          fill
          items={SEARCH_SCOPE_ITEMS}
          onChange={handleScope}
          value={scope}
        />
      ) : null}

      <div
        aria-live="polite"
        className={cn("flex flex-col gap-2.5", hasOutput && "mt-2.5")}
      >
        {showSkeleton ? <ResultsSkeleton scope={scope} /> : null}

        {hitCount > 0 ? (
          <div
            aria-label="Search results"
            className="flex flex-col gap-2.5"
            id={listId}
            key={viewKey}
            onPointerLeave={() => {
              setCursor((current) =>
                current?.source === "pointer" ? null : current,
              );
            }}
            role="listbox"
          >
            <LayoutGroup id={`search-results-${listId}`}>{sections}</LayoutGroup>
          </div>
        ) : null}

        {hasPager && hitCount > 0 ? (
          <div className="flex h-8 items-center justify-between pl-1">
            <span className="text-xs text-white/50 tabular-nums">
              {from}–{to} of {view.total}
            </span>
            <span className="flex items-center gap-1">
              <PagerButton
                direction="previous"
                disabled={view.page === 0}
                onClick={() => setPage(view.page - 1)}
              />
              <PagerButton
                direction="next"
                disabled={view.page >= view.pages - 1}
                onClick={() => setPage(view.page + 1)}
              />
            </span>
          </div>
        ) : null}

        {showEmpty ? (
          <div className="flex flex-col items-center gap-1 px-1 py-3 text-center">
            <p className="text-sm text-white/70">
              No {SEARCH_NOUNS[scope]} for “{query}”
            </p>
            <p className="text-xs text-white/50">{SEARCH_EMPTY_HINTS[scope]}</p>
          </div>
        ) : null}

        {failure ? (
          <div className="flex flex-col items-center gap-2.5">
            <p className="px-1 py-2 text-center text-sm text-white/50">
              {failure.message}
            </p>
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
