"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type JSX,
} from "react";
import { AnimatePresence, motion } from "motion/react";
import { cn, report } from "@omerdlw/base-framework/utils";
import { MoviePosterLink } from "@/features/movie";
import { Cascade, CascadeItem, Section, SectionPart, TabSwap } from "@/motion";
import { EASE } from "@/motion/cinema/score";
import {
  DISCOVER_DECADES,
  DISCOVER_ENDPOINT,
  DISCOVER_GENRES,
  DISCOVER_SORT_OPTIONS,
} from "../lib/constants";
import type { DiscoverResponse, HomeMovie } from "../lib/types";

type Sort = (typeof DISCOVER_SORT_OPTIONS)[number]["value"];

interface Filters {
  decade: number | null;
  genre: number | null;
  sort: Sort;
}

const DEFAULT_FILTERS: Filters = {
  decade: null,
  genre: null,
  sort: "popularity.desc",
};

const GRID = "grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6";
const ANY = "any";

const GENRE_OPTIONS = [
  { label: "anything", value: ANY },
  ...DISCOVER_GENRES.map((genre) => ({
    label: genre.label.toLowerCase(),
    value: String(genre.id),
  })),
];
const DECADE_OPTIONS = DISCOVER_DECADES.map((decade) => ({
  label: decade.label,
  value: decade.value === null ? ANY : String(decade.value),
}));
const SORT_OPTIONS = DISCOVER_SORT_OPTIONS.map((option) => ({
  label: option.label,
  value: option.value as string,
}));

const signature = (filters: Filters) =>
  `${filters.genre ?? ANY}:${filters.decade ?? ANY}:${filters.sort}`;

function query(filters: Filters, page: number): string {
  const params = new URLSearchParams({
    page: String(page),
    sort: filters.sort,
  });
  if (filters.genre !== null) params.set("genre", String(filters.genre));
  if (filters.decade !== null) params.set("decade", String(filters.decade));
  return `${DISCOVER_ENDPOINT}?${params}`;
}

async function fetchPage(
  filters: Filters,
  page: number,
  signal: AbortSignal,
): Promise<DiscoverResponse> {
  const response = await fetch(query(filters, page), {
    headers: { accept: "application/json" },
    signal,
  });
  const body = (await response.json().catch(() => null)) as {
    data?: DiscoverResponse;
    error?: string;
  } | null;
  if (!response.ok || !body?.data) {
    throw new Error(body?.error ?? "Discover is unavailable right now");
  }
  return body.data;
}

function Word({
  label,
  onPick,
  options,
  value,
}: {
  label: string;
  onPick: (value: string) => void;
  options: readonly { label: string; value: string }[];
  value: string;
}): JSX.Element {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLSpanElement>(null);
  const sheet = useId();
  const current = options.find((option) => option.value === value);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <span className="relative inline-block" ref={root}>
      <button
        aria-controls={sheet}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={`${label}: ${current?.label}`}
        className={cn(
          "cine-fade cursor-pointer border-b-[0.06em] border-dashed uppercase outline-none focus-visible:border-white",
          open
            ? "border-white text-white"
            : "border-white/40 text-white hover:border-white",
        )}
        onClick={() => setOpen((was) => !was)}
        type="button"
      >
        {current?.label}
      </button>

      <AnimatePresence>
        {open ? (
          <motion.ul
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="absolute top-full left-0 z-20 mt-4 grid w-[min(30rem,86vw)] origin-top-left grid-cols-2 gap-0.5 rounded-[20px] bg-black/90 p-2 font-geist text-sm font-semibold tracking-normal normal-case ring-1 ring-white/10 backdrop-blur-xl sm:grid-cols-3"
            exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.15 } }}
            id={sheet}
            initial={{ opacity: 0, scale: 0.96, y: -6 }}
            role="listbox"
            transition={{ duration: 0.35, ease: EASE.expo }}
          >
            {options.map((option) => (
              <li key={option.value} role="presentation">
                <button
                  aria-selected={option.value === value}
                  className={cn(
                    "cine-fade w-full cursor-pointer rounded-[12px] px-3 py-2 text-left leading-tight normal-case outline-none first-letter:uppercase hover:bg-white/10 focus-visible:bg-white/10",
                    option.value === value
                      ? "bg-white/10 text-white"
                      : "text-white/60 hover:text-white",
                  )}
                  onClick={() => {
                    onPick(option.value);
                    setOpen(false);
                  }}
                  role="option"
                  type="button"
                >
                  {option.label}
                </button>
              </li>
            ))}
          </motion.ul>
        ) : null}
      </AnimatePresence>
    </span>
  );
}

function Poster({ movie }: { movie: HomeMovie }): JSX.Element {
  return (
    <MoviePosterLink
      caption={false}
      movie={{
        id: movie.id,
        posterPath: movie.posterPath,
        title: movie.title,
        year: movie.year,
      }}
      sizes="(min-width: 1024px) 15vw, (min-width: 640px) 22vw, 30vw"
    />
  );
}

export function HomeDiscover({
  initial,
}: {
  initial: readonly HomeMovie[];
}): JSX.Element {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [pages, setPages] = useState<HomeMovie[][]>(
    initial.length > 0 ? [[...initial]] : [],
  );
  const [hasMore, setHasMore] = useState(initial.length > 0);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [cache] = useState(
    () =>
      new Map<string, { hasMore: boolean; pages: HomeMovie[][] }>(
        initial.length > 0
          ? [
              [
                signature(DEFAULT_FILTERS),
                { hasMore: true, pages: [[...initial]] },
              ],
            ]
          : [],
      ),
  );
  const latest = useRef<AbortController | null>(null);

  const choose = useCallback(
    (next: Filters) => {
      latest.current?.abort();
      setFilters(next);
      setFailed(false);

      const hit = cache.get(signature(next));
      if (hit) {
        setPages(hit.pages);
        setHasMore(hit.hasMore);
        setLoading(false);
        return;
      }

      const controller = new AbortController();
      latest.current = controller;
      setLoading(true);
      fetchPage(next, 1, controller.signal)
        .then((data) => {
          if (controller.signal.aborted) return;
          cache.set(signature(next), {
            hasMore: data.hasMore,
            pages: [data.movies],
          });
          setPages([data.movies]);
          setHasMore(data.hasMore);
          setLoading(false);
        })
        .catch((error) => {
          if (controller.signal.aborted) return;
          report("HomeDiscover load", error);
          setFailed(true);
          setLoading(false);
        });
    },
    [cache],
  );

  const more = useCallback(() => {
    latest.current?.abort();
    const controller = new AbortController();
    latest.current = controller;
    const key = signature(filters);
    setLoading(true);
    fetchPage(filters, pages.length + 1, controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return;
        const next = [...pages, data.movies];
        cache.set(key, { hasMore: data.hasMore, pages: next });
        setPages(next);
        setHasMore(data.hasMore);
        setLoading(false);
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        report("HomeDiscover more", error);
        setFailed(true);
        setLoading(false);
      });
  }, [cache, filters, pages]);

  const [first, ...rest] = pages;
  const empty = !loading && !failed && (first?.length ?? 0) === 0;
  const dim = "text-white/35";

  return (
    <Section className="flex w-full flex-col gap-10">
      <SectionPart className="flex flex-col gap-4">
        <p className="text-[11px] font-semibold tracking-[0.18em] text-white/50 uppercase">
          Discover
        </p>
        <h2 className="max-w-5xl font-zuume text-[clamp(2.6rem,6.4vw,5.5rem)] leading-[1.04] font-bold text-white uppercase">
          <span className={dim}>Tonight I want </span>
          <Word
            label="Genre"
            onPick={(value) =>
              choose({
                ...filters,
                genre: value === ANY ? null : Number(value),
              })
            }
            options={GENRE_OPTIONS}
            value={filters.genre === null ? ANY : String(filters.genre)}
          />
          <span className={dim}> from </span>
          <Word
            label="Years"
            onPick={(value) =>
              choose({
                ...filters,
                decade: value === ANY ? null : Number(value),
              })
            }
            options={DECADE_OPTIONS}
            value={filters.decade === null ? ANY : String(filters.decade)}
          />
          <span className={dim}>, </span>
          <Word
            label="Order"
            onPick={(value) => choose({ ...filters, sort: value as Sort })}
            options={SORT_OPTIONS}
            value={filters.sort}
          />
          <span className={dim}> first.</span>
        </h2>
      </SectionPart>

      <div
        aria-busy={loading}
        className={cn(
          "cine-fade flex flex-col gap-3",
          loading && pages.length > 0 && "opacity-40",
        )}
      >
        {first && first.length > 0 ? (
          <TabSwap className={GRID} id={signature(filters)}>
            {first.map((movie) => (
              <CascadeItem key={movie.id}>
                <Poster movie={movie} />
              </CascadeItem>
            ))}
          </TabSwap>
        ) : null}

        {rest.map((page, position) => (
          <Cascade className={GRID} key={position}>
            {page.map((movie) => (
              <CascadeItem key={movie.id}>
                <Poster movie={movie} />
              </CascadeItem>
            ))}
          </Cascade>
        ))}
      </div>

      {empty ? (
        <p className="text-sm text-white/50">
          Nothing matches that. Change a word.
        </p>
      ) : null}

      {failed ? (
        <p className="text-sm text-white/50">
          Could not load films right now.{" "}
          <button
            className="cursor-pointer underline underline-offset-4 hover:text-white"
            onClick={() => choose(filters)}
            type="button"
          >
            Try again
          </button>
        </p>
      ) : null}

      {hasMore && !failed && first && first.length > 0 ? (
        <button
          className="cine-fade w-fit cursor-pointer text-sm font-semibold text-white/60 hover:text-white disabled:cursor-wait disabled:opacity-60"
          disabled={loading}
          onClick={more}
          type="button"
        >
          {loading ? "Loading…" : "Show more"}
        </button>
      ) : null}
    </Section>
  );
}
