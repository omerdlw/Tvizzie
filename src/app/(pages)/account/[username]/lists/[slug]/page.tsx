import type { JSX } from "react";
import { notFound } from "next/navigation";
import {
  DECADES,
  GENRES,
  LIST_ITEM_SORTS,
  MEDIA_PAGE_SIZE,
  hasMediaFilters,
  parseListItemFilters,
  type SearchParams,
} from "@/features/account/lib/browse";
import { AccountLink } from "@/features/account/components/browse/account-link";
import { EmptyState } from "@/features/account/components/browse/empty-state";
import { FilterBar } from "@/features/account/components/browse/filter-bar";
import { ListCommentChrome } from "@/features/reviews/components/list-comment-chrome";
import { ListComments } from "@/features/account/components/browse/list-comments";
import { ListLikeButton } from "@/features/account/components/browse/list-like-button";
import { EditListButton } from "@/features/account/components/browse/list-owner-actions";
import { Pagination } from "@/features/account/components/browse/pagination";
import { PosterGrid } from "@/features/account/components/browse/poster-grid";
import { SectionHeading } from "@/features/account/components/browse/section-heading";
import {
  getListComments,
  getListDetail,
  getListItemsPage,
} from "@/features/account/server/browse";
import { getAccountPageContext } from "@/features/account/server/context";
import { Icon } from "@/ui";

export default async function AccountListPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; username: string }>;
  searchParams: Promise<SearchParams>;
}): Promise<JSX.Element> {
  const [{ slug, username }, query] = await Promise.all([params, searchParams]);
  const { account, client, isOwner, viewerId } =
    await getAccountPageContext(username);

  const list = await getListDetail({
    client,
    slug: decodeURIComponent(slug),
    username: account.username,
    viewerId,
  });
  if (!list) notFound();

  const filters = parseListItemFilters(query);
  const [items, comments] = await Promise.all([
    getListItemsPage({ client, filters, listId: list.id }),
    getListComments({ client, listId: list.id, viewerId }),
  ]);

  const filtered = hasMediaFilters(filters);
  const ranked = list.isRanked && filters.sort === "position" && !filtered;
  const lists = `/account/${encodeURIComponent(account.username)}/lists`;

  const own = comments.find((comment) => comment.author.id === viewerId);

  return (
    <div className="flex w-full flex-col gap-10">
      <ListCommentChrome
        target={{
          content: own?.content ?? null,
          listId: list.id,
          title: list.title,
        }}
      />
      <header className="flex flex-col gap-4">
        <AccountLink
          className="inline-flex w-fit items-center gap-1.5 text-xs font-semibold text-white/50 uppercase hover:text-white"
          href={lists}
        >
          <Icon icon="solar:alt-arrow-left-linear" size={12} />
          {account.displayName || account.username}’s lists
        </AccountLink>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="flex flex-wrap items-center gap-3 text-2xl font-semibold text-white sm:text-3xl">
              {list.title}
              {list.isPrivate ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold text-white/70">
                  <Icon icon="solar:lock-bold" size={12} />
                  Private
                </span>
              ) : null}
              {list.isRanked ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold text-white/70">
                  <Icon icon="solar:ranking-bold" size={12} />
                  Ranked
                </span>
              ) : null}
            </h1>
            {list.description ? (
              <p className="mt-2 max-w-2xl text-sm leading-relaxed whitespace-pre-line text-white/60">
                {list.description}
              </p>
            ) : null}
            <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/50">
              <span>
                A list by{" "}
                <AccountLink
                  className="font-semibold text-white hover:underline"
                  href={`/account/${encodeURIComponent(list.owner.username)}`}
                >
                  {list.owner.displayName}
                </AccountLink>
              </span>
              <span>•</span>
              <span>
                {list.itemsCount} {list.itemsCount === 1 ? "film" : "films"}
              </span>
              <span>•</span>
              <span>
                {list.reviewsCount}{" "}
                {list.reviewsCount === 1 ? "comment" : "comments"}
              </span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <ListLikeButton
              liked={list.liked}
              likesCount={list.likesCount}
              listId={list.id}
              signedIn={viewerId !== null}
            />
            {isOwner ? (
              <EditListButton
                className="center h-9 w-9 cursor-pointer rounded-[13px] bg-white/5 text-white/70 ring-1 ring-white/5 ring-inset hover:bg-white/10 hover:text-white"
                list={{
                  description: list.description,
                  id: list.id,
                  isPrivate: list.isPrivate,
                  isRanked: list.isRanked,
                  slug: list.slug,
                  title: list.title,
                }}
                username={account.username}
              />
            ) : null}
          </div>
        </div>
      </header>

      <section>
        <SectionHeading
          icon="solar:clapperboard-play-bold"
          summary={filtered ? `${items.total} shown` : undefined}
          title="Films"
        />
        {list.itemsCount > 0 || filtered ? (
          <FilterBar
            fields={[
              {
                allLabel: "Any genre",
                key: "genre",
                options: GENRES.map((genre) => ({
                  label: genre.label,
                  value: String(genre.id),
                })),
              },
              {
                allLabel: "Any decade",
                key: "decade",
                options: DECADES.map((decade) => ({
                  label: `${decade}s`,
                  value: String(decade),
                })),
              },
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
      </section>

      <section>
        <SectionHeading
          icon="solar:chat-round-bold"
          summary={`${list.reviewsCount}`}
          title="Comments"
        />
        <ListComments
          comments={comments}
          listId={list.id}
          listTitle={list.title}
          viewerId={viewerId}
        />
      </section>
    </div>
  );
}
