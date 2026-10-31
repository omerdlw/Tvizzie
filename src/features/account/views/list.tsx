import type { JSX } from "react";
import { notFound } from "next/navigation";
import {
  LIST_ITEM_SORTS,
  MEDIA_PAGE_SIZE,
  hasMediaFilters,
  parseListItemFilters,
  type AccountViewProps,
  MEDIA_FILTERS,
} from "../lib/browse";
import { AccountLink } from "../components/browse/account-link";
import { FilterBar } from "../components/browse/filter-bar";
import { ListComments } from "../components/browse/list-comments";
import { ListChrome } from "../components/browse/list-chrome";
import { Pagination } from "../components/browse/pagination";
import { PosterGrid } from "../components/browse/poster-grid";
import { EmptyState } from "../components/browse/empty-state";
import { Section, counted } from "../components/browse/section";
import { formatShortDate } from "../lib/dates";
import { Icon } from "@/ui";
import { tmdbImageUrl } from "@/infrastructure/tmdb/images";
import { getListPage } from "../server/browse";
import { getAccountPageContext } from "../server/context";
import { accountHref } from "@/config/routes";

export async function AccountListView({
  query,
  slug,
  username,
}: AccountViewProps & { slug: string }): Promise<JSX.Element | null> {
  const { account, client, isOwner, locked, viewerId } =
    await getAccountPageContext(username);
  if (locked) return null;

  const filters = parseListItemFilters(query);
  const page = await getListPage({
    client,
    filters,
    owner: account,
    slug,
  });
  if (!page) notFound();
  const { commentCount, comments, items, list, ownComment } = page;

  const filtered = hasMediaFilters(filters);
  const ranked = list.isRanked && filters.sort === "position" && !filtered;
  const lists = `${accountHref(account.username)}/lists`;

  return (
    <div className="flex w-full flex-col gap-10">
      <ListChrome
        comment={ownComment}
        icon={tmdbImageUrl("poster", list.posterPath, "w185")}
        isOwner={isOwner}
        list={list}
        signedIn={viewerId !== null}
      />
      <header className="flex flex-col gap-5">
        <AccountLink
          className="inline-flex w-fit items-center gap-1.5 text-[11px] font-semibold tracking-[0.14em] text-white/40 uppercase hover:text-white"
          href={lists}
        >
          <Icon icon="solar:alt-arrow-left-linear" size={13} />
          All lists
        </AccountLink>

        <div className="flex min-w-0 flex-col gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <h1 className="text-2xl leading-8 font-semibold tracking-tight break-words text-white">
              {list.title}
            </h1>
            {list.isPrivate ? (
              <Icon
                aria-label="Private list"
                className="shrink-0 text-white/40"
                icon="solar:lock-bold"
                size={16}
              />
            ) : null}
          </div>
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-white/50">
            <span>
              By{" "}
              <AccountLink
                className="font-medium text-white/80 hover:text-white underline decoration-transparent hover:decoration-current"
                href={accountHref(list.owner.username)}
              >
                {list.owner.displayName}
              </AccountLink>
            </span>
            {[
              counted(list.itemsCount, "film"),
              list.isRanked ? "Ranked" : null,
              `Updated ${formatShortDate(list.updatedAt)}`,
            ]
              .filter(Boolean)
              .map((part) => (
                <span
                  className="inline-flex items-center gap-x-2 whitespace-nowrap"
                  key={part}
                >
                  <span aria-hidden="true" className="text-white/20">
                    ·
                  </span>
                  {part}
                </span>
              ))}
          </p>
          {list.description ? (
            <p className="max-w-2xl text-sm leading-6 whitespace-pre-line text-white/70">
              {list.description}
            </p>
          ) : null}
        </div>
      </header>

      <div className="flex w-full flex-col">
        {list.itemsCount > 0 || filtered ? (
          <FilterBar
            fields={[
              ...MEDIA_FILTERS,
              {
                defaultValue: "position",
                key: "sort",
                options: LIST_ITEM_SORTS,
              },
            ]}
            searchPlaceholder="Search this list"
          />
        ) : null}

        {items.items.length > 0 ? (
          <>
            <PosterGrid
              items={items.items}
              numberFrom={
                ranked ? (items.page - 1) * MEDIA_PAGE_SIZE + 1 : undefined
              }
              source={isOwner ? { kind: "list", listId: list.id } : null}
            />
            <Pagination page={items.page} pageCount={items.pageCount} />
          </>
        ) : (
          <EmptyState icon="solar:clapperboard-play-bold">
            {filtered
              ? "No films match these filters"
              : isOwner
                ? "Add films from any movie page with “Add to list”"
                : "This list is empty"}
          </EmptyState>
        )}
      </div>

      <Section summary={counted(commentCount, "comment")} title="Comments">
        <ListComments
          comments={comments}
          listId={list.id}
          listTitle={list.title}
          viewerId={viewerId}
        />
      </Section>
    </div>
  );
}
