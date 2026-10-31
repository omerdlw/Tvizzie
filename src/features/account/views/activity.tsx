import type { JSX } from "react";
import {
  ACTIVITY_GROUPS,
  ACTIVITY_SORTS,
  parseActivityFilters,
  type AccountViewProps,
} from "../lib/browse";
import { ActivityLog, ActivityRow } from "../components/browse/activity-row";
import { FilterBar } from "../components/browse/filter-bar";
import { Pagination } from "../components/browse/pagination";
import { EmptyState } from "../components/browse/empty-state";
import { getActivityPage } from "../server/browse";
import { getAccountPageContext } from "../server/context";

export async function AccountActivityView({
  query,
  username,
}: AccountViewProps): Promise<JSX.Element | null> {
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
              ? "What you do on Guffin shows up here"
              : "No activity yet"}
        </EmptyState>
      )}
    </div>
  );
}
