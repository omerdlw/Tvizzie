import type { JSX } from "react";
import {
  LIST_SORTS,
  parseListSort,
  readPage,
  type SearchParams,
} from "@/features/account/lib/browse";
import { EmptyState } from "@/features/account/components/browse/empty-state";
import { FilterBar } from "@/features/account/components/browse/filter-bar";
import {
  LIST_GRID,
  ListCard,
} from "@/features/account/components/browse/list-card";
import { NewListButton } from "@/features/account/components/browse/list-owner-actions";
import { Pagination } from "@/features/account/components/browse/pagination";
import { SectionHeading } from "@/features/account/components/browse/section-heading";
import { getListsPage } from "@/features/account/server/browse";
import { getAccountPageContext } from "@/features/account/server/context";

export default async function AccountListsPage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<SearchParams>;
}): Promise<JSX.Element> {
  const [{ username }, query] = await Promise.all([params, searchParams]);
  const { account, client, isOwner } = await getAccountPageContext(username);
  const result = await getListsPage({
    accountId: account.id,
    client,
    page: readPage(query),
    sort: parseListSort(query),
  });

  return (
    <section className="w-full">
      <SectionHeading
        action={isOwner ? <NewListButton username={account.username} /> : null}
        icon="solar:list-bold"
        summary={`${result.total} ${result.total === 1 ? "list" : "lists"}`}
        title="Lists"
      />
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
          <div className={LIST_GRID}>
            {result.items.map((list) => (
              <ListCard
                key={list.id}
                list={list}
                ownerEdit={isOwner}
                username={account.username}
              />
            ))}
          </div>
          <Pagination page={result.page} pageCount={result.pageCount} />
        </>
      ) : (
        <EmptyState icon="solar:list-bold">
          {isOwner
            ? "Start a list here, or from any movie page"
            : "No lists yet"}
        </EmptyState>
      )}
    </section>
  );
}
