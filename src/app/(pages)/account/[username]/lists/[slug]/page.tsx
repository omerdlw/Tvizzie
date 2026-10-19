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
import { FilterBar } from "@/features/account/components/browse/filter-bar";
import { ListComments } from "@/features/account/components/browse/list-comments";
import { ListChrome } from "@/features/account/components/browse/list-chrome";
import { Pagination } from "@/features/account/components/browse/pagination";
import { PosterGrid } from "@/features/account/components/browse/poster-grid";
import { EmptyState } from "@/features/account/components/browse/empty-state";
import { Section, counted } from "@/features/account/components/browse/section";
import { formatShortDate } from "@/features/account/lib/dates";
import { Icon } from "@/ui";
import { tmdbImageUrl } from "@/infrastructure/tmdb/images";
import {
  getListComments,
  getListDetail,
  getListItemsPage,
} from "@/features/account/server/browse";
import { getAccountPageContext } from "@/features/account/server/context";

export default async function AccountListPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; username: string }>;
  searchParams: Promise<SearchParams>;
}): Promise<JSX.Element | null> {
  const [{ slug, username }, query] = await Promise.all([params, searchParams]);
  const { account, client, isOwner, locked, viewerId } =
    await getAccountPageContext(username);
  if (locked) return null;

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
      <ListChrome
        comment={own?.content ?? null}
        icon={tmdbImageUrl("poster", list.posterPath, "w185")}
        isOwner={isOwner}
        list={list}
        signedIn={viewerId !== null}
      />
      <header className="flex flex-col gap-5">
        <AccountLink
          className="inline-flex w-fit items-center gap-1.5 text-[11px] font-semibold tracking-[0.14em] text-white/40 uppercase transition-colors hover:text-white"
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
                className="font-medium text-white/80 hover:text-white hover:underline"
                href={`/account/${encodeURIComponent(list.owner.username)}`}
              >
                {list.owner.displayName}
              </AccountLink>
            </span>
            <span aria-hidden="true" className="text-white/20">
              ·
            </span>
            <span>{counted(list.itemsCount, "film")}</span>
            {list.isRanked ? (
              <>
                <span aria-hidden="true" className="text-white/20">
                  ·
                </span>
                <span>Ranked</span>
              </>
            ) : null}
            <span aria-hidden="true" className="text-white/20">
              ·
            </span>
            <span>Updated {formatShortDate(list.updatedAt)}</span>
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
            docked
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
      </div>

      <Section summary={counted(list.reviewsCount, "comment")} title="Comments">
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
