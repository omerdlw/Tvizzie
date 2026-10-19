import type { JSX } from "react";
import {
  DECADES,
  GENRES,
  MEDIA_SORTS,
  hasMediaFilters,
  parseMediaFilters,
  type SearchParams,
} from "../../lib/browse";
import { getAccountPageContext } from "../../server/context";
import { getMediaPage, type MediaKind } from "../../server/browse";
import { EmptyState } from "./empty-state";
import { FilterBar } from "./filter-bar";
import { Pagination } from "./pagination";
import { PosterGrid } from "./poster-grid";

const KINDS: Record<
  MediaKind,
  { empty: string; emptyOwn: string; icon: string; title: string }
> = {
  likes: {
    empty: "No liked movies yet",
    emptyOwn: "Movies you like show up here. Pin up to five as your favorites.",
    icon: "solar:heart-bold",
    title: "Likes",
  },
  watched: {
    empty: "No watched movies yet",
    emptyOwn: "Movies you mark as watched show up here",
    icon: "solar:eye-bold",
    title: "Watched",
  },
  watchlist: {
    empty: "The watchlist is empty",
    emptyOwn: "Movies you save for later show up here",
    icon: "solar:bookmark-bold",
    title: "Watchlist",
  },
};

export async function MediaCollectionPage({
  kind,
  searchParams,
  username,
}: {
  kind: MediaKind;
  searchParams: Promise<SearchParams>;
  username: string;
}): Promise<JSX.Element | null> {
  const [{ account, client, isOwner, locked }, params] = await Promise.all([
    getAccountPageContext(username),
    searchParams,
  ]);
  if (locked) return null;
  const filters = parseMediaFilters(params);
  const result = await getMediaPage({
    accountId: account.id,
    client,
    filters,
    kind,
  });
  const copy = KINDS[kind];
  const filtered = hasMediaFilters(filters);
  const showBar = result.total > 0 || filtered;

  return (
    <div className="flex w-full flex-col">
      {showBar ? (
        <FilterBar
          docked
          fields={[
            {
              allLabel: "Any genre",
              key: "genre",
              options: GENRES.map((genre) => ({
                label: genre.label,
                value: String(genre.id),
              })),
            },
            {
              allLabel: "Any decade",
              key: "decade",
              options: DECADES.map((decade) => ({
                label: `${decade}s`,
                value: String(decade),
              })),
            },
            {
              defaultValue: "added_desc",
              key: "sort",
              options: MEDIA_SORTS,
            },
          ]}
          searchPlaceholder="Search titles"
        />
      ) : null}

      {result.items.length > 0 ? (
        <>
          <PosterGrid items={result.items} source={isOwner ? { kind } : null} />
          <Pagination page={result.page} pageCount={result.pageCount} />
        </>
      ) : (
        <EmptyState icon={copy.icon}>
          {filtered
            ? "No films match these filters"
            : isOwner
              ? copy.emptyOwn
              : copy.empty}
        </EmptyState>
      )}
    </div>
  );
}
