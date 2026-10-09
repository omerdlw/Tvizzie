import type { JSX } from "react";
import {
  REVIEW_KINDS,
  REVIEW_SORTS,
  parseReviewFilters,
  type SearchParams,
} from "@/features/account/lib/browse";
import { EmptyState } from "@/features/account/components/browse/empty-state";
import { FilterBar } from "@/features/account/components/browse/filter-bar";
import { Pagination } from "@/features/account/components/browse/pagination";
import { ReviewCard } from "@/features/account/components/browse/review-card";
import { SectionHeading } from "@/features/account/components/browse/section-heading";
import { getReviewsPage } from "@/features/account/server/browse";
import { getAccountPageContext } from "@/features/account/server/context";

export default async function AccountReviewsPage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<SearchParams>;
}): Promise<JSX.Element> {
  const [{ username }, query] = await Promise.all([params, searchParams]);
  const { account, client, isOwner, viewerId } =
    await getAccountPageContext(username);
  const filters = parseReviewFilters(query);
  const result = await getReviewsPage({
    accountId: account.id,
    client,
    filters,
    viewerId,
  });
  const filtered = Boolean(filters.query) || filters.kind !== "all";

  return (
    <section className="w-full">
      <SectionHeading
        icon="solar:chat-round-bold"
        summary={`${result.total} ${result.total === 1 ? "review" : "reviews"}`}
        title="Reviews"
      />
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
          <div className="flex flex-col gap-3">
            {result.items.map((review) => (
              <ReviewCard
                isOwner={isOwner}
                key={review.id}
                review={review}
                signedIn={viewerId !== null}
              />
            ))}
          </div>
          <Pagination page={result.page} pageCount={result.pageCount} />
        </>
      ) : (
        <EmptyState icon="solar:chat-round-bold">
          {filtered
            ? "No reviews match these filters"
            : isOwner
              ? "Your reviews and ratings show up here"
              : "No reviews yet"}
        </EmptyState>
      )}
    </section>
  );
}
