import type { JSX } from "react";
import { AccountLink, PosterStack } from "@/features/account";
import { Avatar, Icon, TONE } from "@/ui";
import { Header, Item, Section } from "@/motion/stage";
import { accountHref, listHref } from "@/config/routes";
import type { PopularList } from "../lib/types";

const count = new Intl.NumberFormat("en", {
  maximumFractionDigits: 1,
  notation: "compact",
});

function ListRow({ list }: { list: PopularList }): JSX.Element {
  const href = listHref(list.owner.username, list.slug);
  return (
    <Item
      as="li"
      className="flex flex-col gap-4 py-6 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:gap-6"
      from="light"
    >
      <AccountLink
        aria-label={list.title}
        className="block w-full shrink-0 ui-fade hover:opacity-80 sm:w-60"
        href={href}
      >
        <PosterStack paths={list.previews} />
      </AccountLink>

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <h3 className="min-w-0 truncate text-lg leading-7 font-semibold text-white">
          <AccountLink
            className="underline decoration-transparent hover:decoration-current"
            href={href}
          >
            {list.title}
          </AccountLink>
        </h3>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] text-white/50 tabular-nums">
          <AccountLink
            className="flex min-w-0 items-center gap-2 font-semibold text-white/80 hover:text-white"
            href={accountHref(list.owner.username)}
          >
            <Avatar
              className="rounded-full"
              name={list.owner.displayName}
              size={20}
              src={list.owner.avatarUrl ?? undefined}
            />
            <span className="truncate">{list.owner.displayName}</span>
          </AccountLink>
          <span>
            {list.itemsCount.toLocaleString("en-US")}{" "}
            {list.itemsCount === 1 ? "film" : "films"}
          </span>
          <span className="inline-flex items-center gap-1">
            <Icon icon="solar:heart-bold" size={14} />
            {count.format(list.likesCount)}
          </span>
          <span className="inline-flex items-center gap-1">
            <Icon icon="solar:chat-round-bold" size={14} />
            {count.format(list.reviewsCount)}
          </span>
        </div>
        {list.description ? (
          <p className="mt-1 line-clamp-3 max-w-2xl text-[15px] leading-7 text-white/60">
            {list.description}
          </p>
        ) : null}
      </div>
    </Item>
  );
}

export async function MoviePopularLists({
  lists,
}: {
  lists: Promise<PopularList[]>;
}): Promise<JSX.Element | null> {
  const resolved = await lists;
  if (resolved.length === 0) return null;

  return (
    <Section className="flex w-full flex-col">
      <Header icon="solar:widget-bold" title="Popular Lists" />
      <ul className={`flex flex-col divide-y ${TONE.rules}`}>
        {resolved.map((list) => (
          <ListRow key={list.id} list={list} />
        ))}
      </ul>
    </Section>
  );
}
