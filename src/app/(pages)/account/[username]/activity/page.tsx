import type { JSX } from "react";
import {
  ACTIVITY_GROUPS,
  ACTIVITY_SORTS,
  parseActivityFilters,
  type SearchParams,
} from "@/features/account/lib/browse";
import { ActivityRow } from "@/features/account/components/browse/activity-row";
import { EmptyState } from "@/features/account/components/browse/empty-state";
import { FilterBar } from "@/features/account/components/browse/filter-bar";
import { Pagination } from "@/features/account/components/browse/pagination";
import { SectionHeading } from "@/features/account/components/browse/section-heading";
import { getActivityPage } from "@/features/account/server/browse";
import { getAccountPageContext } from "@/features/account/server/context";

export default async function AccountActivityPage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<SearchParams>;
}): Promise<JSX.Element> {
  const [{ username }, query] = await Promise.all([params, searchParams]);
  const { account, client, isOwner } = await getAccountPageContext(username);
  const filters = parseActivityFilters(query);
  const result = await getActivityPage({
    accountId: account.id,
    accountUsername: account.username,
    client,
    filters,
  });
  const actor = {
    displayName: account.displayName || account.username,
    username: account.username,
  };

  return (
    <section className="w-full">
      <SectionHeading
        icon="solar:bolt-bold"
        summary={`${result.total} ${result.total === 1 ? "event" : "events"}`}
        title="Activity"
      />
      {result.total > 0 || filters.group !== "all" ? (
        <FilterBar
          fields={[
            { defaultValue: "all", key: "type", options: ACTIVITY_GROUPS },
            { defaultValue: "newest", key: "sort", options: ACTIVITY_SORTS },
          ]}
          searchPlaceholder={null}
        />
      ) : null}

      {result.items.length > 0 ? (
        <>
          <div className="flex flex-col gap-2">
            {result.items.map((item) => (
              <ActivityRow actor={actor} item={item} key={item.id} />
            ))}
          </div>
          <Pagination page={result.page} pageCount={result.pageCount} />
        </>
      ) : (
        <EmptyState icon="solar:bolt-bold">
          {filters.group !== "all"
            ? "No activity of this kind"
            : isOwner
              ? "What you do on Tvizzie shows up here"
              : "No activity yet"}
        </EmptyState>
      )}
    </section>
  );
}
