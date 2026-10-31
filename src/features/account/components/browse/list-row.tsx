import type { JSX } from "react";
import { Icon } from "@/ui";
import type { ListCardData } from "../../lib/browse-data";
import { formatShortDate } from "../../lib/dates";
import { AccountLink } from "./account-link";
import { EditListButton } from "./list-owner-actions";
import { PosterStack } from "./poster-stack";
import { counted } from "./section";
import { listHref } from "@/config/routes";

function ListRow({
  list,
  ownerEdit,
  username,
}: {
  list: ListCardData;
  ownerEdit?: boolean;
  username: string;
}): JSX.Element {
  const href = listHref(username, list.slug);

  return (
    <li className="flex flex-col gap-4 py-6 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:gap-6">
      <AccountLink
        aria-label={list.title}
        className="block w-full shrink-0 ui-fade hover:opacity-80 sm:w-60"
        href={href}
      >
        <PosterStack paths={list.previews} />
      </AccountLink>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex min-w-0 items-center gap-2">
          <h3 className="min-w-0 truncate text-base leading-6 font-semibold text-white">
            <AccountLink
              className="underline decoration-transparent hover:decoration-current"
              href={href}
            >
              {list.title}
            </AccountLink>
          </h3>
          {list.isPrivate ? (
            <Icon
              aria-label="Private"
              className="shrink-0 text-white/40"
              icon="solar:lock-bold"
              size={13}
            />
          ) : null}
        </div>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/40 tabular-nums">
          <span>
            {counted(list.itemsCount, "film")}
            {list.isRanked ? " · Ranked" : ""}
          </span>
          <span>Updated {formatShortDate(list.updatedAt)}</span>
          <span className="inline-flex items-center gap-1">
            <Icon icon="solar:heart-linear" size={13} />
            {list.likesCount}
          </span>
          <span className="inline-flex items-center gap-1">
            <Icon icon="solar:chat-round-linear" size={13} />
            {list.reviewsCount}
          </span>
        </p>
        {list.description ? (
          <p className="mt-1 line-clamp-2 max-w-2xl text-sm leading-6 text-white/60">
            {list.description}
          </p>
        ) : null}
      </div>

      {ownerEdit ? (
        <EditListButton
          className="center size-8 shrink-0 cursor-pointer self-start rounded-full text-white/50 ring-1 ring-white/10 ring-inset hover:bg-white/10 hover:text-white"
          list={{
            description: list.description,
            id: list.id,
            isPrivate: list.isPrivate,
            isRanked: list.isRanked,
            itemsCount: list.itemsCount,
            slug: list.slug,
            title: list.title,
          }}
          username={username}
        />
      ) : null}
    </li>
  );
}

export function ListRows({
  lists,
  ownerEdit,
  username,
}: {
  lists: readonly ListCardData[];
  ownerEdit?: boolean;
  username: string;
}): JSX.Element {
  return (
    <ul className="flex flex-col divide-y divide-white/[0.07]">
      {lists.map((list) => (
        <ListRow
          key={list.id}
          list={list}
          ownerEdit={ownerEdit}
          username={username}
        />
      ))}
    </ul>
  );
}

export function ListTeaser({
  list,
  username,
}: {
  list: ListCardData;
  username: string;
}): JSX.Element {
  const href = listHref(username, list.slug);
  return (
    <AccountLink className="group/list flex flex-col gap-2.5" href={href}>
      <PosterStack
        className="ui-fade group-hover/list:opacity-80"
        paths={list.previews}
      />
      <span className="flex min-w-0 items-baseline gap-2">
        <span className="truncate text-sm font-semibold text-white underline decoration-transparent group-hover/list:decoration-current">
          {list.title}
        </span>
        <span className="shrink-0 text-xs text-white/40 tabular-nums">
          {counted(list.itemsCount, "film")}
        </span>
      </span>
    </AccountLink>
  );
}
