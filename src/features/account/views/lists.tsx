import type { JSX } from "react";
import {
  LIST_SORTS,
  parseListSort,
  readPage,
  type AccountViewProps,
} from "../lib/browse";
import { FilterBar } from "../components/browse/filter-bar";
import { ListRows } from "../components/browse/list-row";
import { ListsChrome } from "../components/browse/list-owner-actions";
import { Pagination } from "../components/browse/pagination";
import { EmptyState } from "../components/browse/empty-state";
import { getListsPage } from "../server/browse";
import { getAccountPageContext } from "../server/context";

export async function AccountListsView({
  query,
  username,
}: AccountViewProps): Promise<JSX.Element | null> {
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
