import type { JSX } from "react";
import { AccountLink, PosterStack } from "@/features/account";
import { Header, Item, Section } from "@/motion/stage";
import { Avatar, Icon } from "@/ui";
import { accountHref, listHref } from "@/config/routes";
import { compact } from "../lib/format";
import type { HomeList } from "../lib/types";

function ListCard({ list }: { list: HomeList }): JSX.Element {
  const href = listHref(list.owner.username, list.slug);
  return (
    <Item as="li" className="flex min-w-0 flex-col gap-3" from="light">
      <AccountLink
        aria-label={list.title}
        className="block ui-fade hover:opacity-80"
        href={href}
      >
        <PosterStack paths={list.previews} />
      </AccountLink>
      <h3 className="min-w-0 truncate text-base font-semibold text-white">
        <AccountLink
          className="underline decoration-transparent hover:decoration-current"
          href={href}
        >
          {list.title}
        </AccountLink>
      </h3>
      <div className="flex min-w-0 items-center gap-x-4 text-[13px] text-white/50 tabular-nums">
        <AccountLink
          className="flex min-w-0 items-center gap-2 font-semibold text-white/80 hover:text-white"
          href={accountHref(list.owner.username)}
        >
          <Avatar
            className="shrink-0 rounded-full"
            name={list.owner.displayName}
            size={20}
            src={list.owner.avatarUrl ?? undefined}
          />
          <span className="truncate">{list.owner.displayName}</span>
        </AccountLink>
        <span className="shrink-0">{list.films} films</span>
        <span className="inline-flex shrink-0 items-center gap-1">
          <Icon icon="solar:heart-bold" size={13} />
          {compact(list.likes)}
        </span>
      </div>
    </Item>
  );
}

export function HomeLists({
  lists,
}: {
  lists: HomeList[];
}): JSX.Element | null {
  if (lists.length === 0) return null;
  return (
    <Section className="flex w-full flex-col">
      <Header icon="solar:widget-bold" title="Popular lists" />
      <ul className="grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
        {lists.map((list) => (
          <ListCard key={list.id} list={list} />
        ))}
      </ul>
    </Section>
  );
}
