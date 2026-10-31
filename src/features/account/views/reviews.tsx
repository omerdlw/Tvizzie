import type { JSX } from "react";
import {
  REVIEW_KINDS,
  REVIEW_SORTS,
  parseReviewFilters,
  type AccountViewProps,
} from "../lib/browse";
import { FilterBar } from "../components/browse/filter-bar";
import { Pagination } from "../components/browse/pagination";
import { ReviewList } from "../components/browse/review-list";
import { EmptyState } from "../components/browse/empty-state";
import { getReviewsPage } from "../server/browse";
import { getAccountPageContext } from "../server/context";

export async function AccountReviewsView({
  query,
  username,
}: AccountViewProps): Promise<JSX.Element | null> {
  const { account, client, isOwner, locked, viewerId } =
    await getAccountPageContext(username);
  if (locked) return null;
  const filters = parseReviewFilters(query);
  const result = await getReviewsPage({
    accountId: account.id,
    client,
    filters,
    viewerId,
  });
  const filtered = Boolean(filters.query) || filters.kind !== "all";

  return (
    <div className="flex w-full flex-col">
      {result.total > 0 || filtered ? (
        <FilterBar
          fields={[
            { defaultValue: "all", key: "kind", options: REVIEW_KINDS },
            { defaultValue: "newest", key: "sort", options: REVIEW_SORTS },
          ]}
          searchPlaceholder="Search reviews"
        />
      ) : null}

      {result.items.length > 0 ? (
        <>
          <ReviewList
            isOwner={isOwner}
            reviews={result.items}
            signedIn={viewerId !== null}
            username={account.username}
          />
          <Pagination page={result.page} pageCount={result.pageCount} />
        </>
      ) : (
        <EmptyState icon="solar:pen-new-square-bold">
          {filtered
            ? "No reviews match these filters"
            : isOwner
              ? "Your reviews and ratings show up here"
              : "No reviews yet"}
        </EmptyState>
      )}
    </div>
  );
}
