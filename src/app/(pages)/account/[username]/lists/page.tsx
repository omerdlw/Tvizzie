import type { JSX } from "react";
import {
  LIST_SORTS,
  parseListSort,
  readPage,
  type SearchParams,
} from "@/features/account/lib/browse";
import { FilterBar } from "@/features/account/components/browse/filter-bar";
import { ListRows } from "@/features/account/components/browse/list-row";
import { ListsChrome } from "@/features/account/components/browse/list-owner-actions";
import { Pagination } from "@/features/account/components/browse/pagination";
import { EmptyState } from "@/features/account/components/browse/empty-state";
import { getListsPage } from "@/features/account/server/browse";
import { getAccountPageContext } from "@/features/account/server/context";

export default async function AccountListsPage({
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
  const result = await getListsPage({
    accountId: account.id,
    client,
    page: readPage(query),
    sort: parseListSort(query),
  });

  return (
    <div className="flex w-full flex-col">
      <ListsChrome isOwner={isOwner} username={account.username} />
      {result.total > 1 ? (
        <FilterBar
          docked
          fields={[
            { defaultValue: "updated_desc", key: "sort", options: LIST_SORTS },
          ]}
          searchPlaceholder={null}
        />
      ) : null}

      {result.items.length > 0 ? (
        <>
          <ListRows
            lists={result.items}
            ownerEdit={isOwner}
            username={account.username}
          />
          <Pagination page={result.page} pageCount={result.pageCount} />
        </>
      ) : (
        <EmptyState icon="solar:list-bold">
          {isOwner
            ? "Start a list here, or from any movie page"
            : "No lists yet"}
        </EmptyState>
      )}
    </div>
  );
}
