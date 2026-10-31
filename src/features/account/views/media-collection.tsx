import type { JSX } from "react";
import {
  MEDIA_SORTS,
  hasMediaFilters,
  parseMediaFilters,
  type AccountViewProps,
  MEDIA_FILTERS,
} from "../lib/browse";
import { getAccountPageContext } from "../server/context";
import { getMediaPage, type MediaKind } from "../server/browse";
import { EmptyState } from "../components/browse/empty-state";
import { FilterBar } from "../components/browse/filter-bar";
import { Pagination } from "../components/browse/pagination";
import { PosterGrid } from "../components/browse/poster-grid";

const KINDS: Record<
  MediaKind,
  { empty: string; emptyOwn: string; icon: string }
> = {
  likes: {
    empty: "No liked movies yet",
    emptyOwn: "Movies you like show up here. Pin up to five as your favorites.",
    icon: "solar:heart-bold",
  },
  watched: {
    empty: "No watched movies yet",
    emptyOwn: "Movies you mark as watched show up here",
    icon: "solar:eye-bold",
  },
  watchlist: {
    empty: "The watchlist is empty",
    emptyOwn: "Movies you save for later show up here",
    icon: "solar:bookmark-bold",
  },
};

export async function AccountMediaView({
  kind,
  query,
  username,
}: AccountViewProps & { kind: MediaKind }): Promise<JSX.Element | null> {
  const { account, client, isOwner, locked } =
    await getAccountPageContext(username);
  if (locked) return null;
  const filters = parseMediaFilters(query);
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
          fields={[
            ...MEDIA_FILTERS,
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
