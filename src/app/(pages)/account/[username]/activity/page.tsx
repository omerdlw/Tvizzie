import type { JSX } from "react";
import {
  ACTIVITY_GROUPS,
  ACTIVITY_SORTS,
  parseActivityFilters,
  type SearchParams,
} from "@/features/account/lib/browse";
import {
  ActivityLog,
  ActivityRow,
} from "@/features/account/components/browse/activity-row";
import { FilterBar } from "@/features/account/components/browse/filter-bar";
import { Pagination } from "@/features/account/components/browse/pagination";
import { EmptyState } from "@/features/account/components/browse/empty-state";
import { getActivityPage } from "@/features/account/server/browse";
import { getAccountPageContext } from "@/features/account/server/context";

export default async function AccountActivityPage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<SearchParams>;
}): Promise<JSX.Element | null> {
  const [{ username }, query] = await Promise.all([params, searchParams]);
  const { account, client, isOwner, locked } =
    await getAccountPageContext(username);
  if (locked) return null;
  const filters = parseActivityFilters(query);
  const result = await getActivityPage({
    accountId: account.id,
    accountUsername: account.username,
    client,
    filters,
  });
  const actor = {
    displayName: isOwner ? "You" : account.displayName || account.username,
    username: account.username,
  };

  return (
    <div className="flex w-full flex-col">
      {result.total > 0 || filters.group !== "all" ? (
        <FilterBar
          docked
          fields={[
            { defaultValue: "all", key: "type", options: ACTIVITY_GROUPS },
            { defaultValue: "newest", key: "sort", options: ACTIVITY_SORTS },
          ]}
          searchPlaceholder={null}
        />
      ) : null}

      {result.items.length > 0 ? (
        <>
          <ActivityLog>
            {result.items.map((item) => (
              <ActivityRow actor={actor} item={item} key={item.id} />
            ))}
          </ActivityLog>
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
    </div>
  );
}
