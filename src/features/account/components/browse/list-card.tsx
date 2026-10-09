import type { JSX } from "react";
import { cn } from "@omerdlw/base-framework/utils";
import { AdaptiveImage, Icon } from "@/ui";
import { tmdbImageUrl } from "@/infrastructure/tmdb/images";
import type { ListCardData } from "../../lib/browse-data";
import { AccountLink } from "./account-link";
import { EditListButton } from "./list-owner-actions";

const DATE = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

const SLOTS = [
  { rotate: -10, x: -76 },
  { rotate: -5, x: -38 },
  { rotate: 0, x: 0 },
  { rotate: 5, x: 38 },
  { rotate: 10, x: 76 },
] as const;

function Fan({ previews }: { previews: (string | null)[] }): JSX.Element {
  return (
    <div className="relative h-[190px] overflow-hidden">
      {SLOTS.map((slot, index) => {
        const centre = Math.abs(index - 2);
        const poster = previews[index % Math.max(previews.length, 1)] ?? null;
        return (
          <div
            className={cn(
              "absolute top-6 left-1/2 h-[156px] w-[98px] overflow-hidden rounded-[12px] bg-black/80 ring-1 ring-white/5 ring-inset transition-transform duration-slow ease-out-expo",
              "translate-x-[calc(-50%+var(--x))] rotate-[var(--r)]",
              "group-hover/list:translate-x-[calc(-50%+var(--x)*1.35)] group-hover/list:-translate-y-2 group-hover/list:rotate-[var(--rh)]",
            )}
            key={index}
            style={
              {
                "--r": `${slot.rotate}deg`,
                "--rh": `${slot.rotate * 1.3}deg`,
                "--x": `${slot.x}px`,
                filter: `brightness(${centre === 0 ? 1 : centre === 1 ? 0.65 : 0.4})`,
                zIndex: 10 - centre,
              } as React.CSSProperties
            }
          >
            <AdaptiveImage
              alt=""
              className="object-cover"
              fallback={
                <div className="center h-full w-full text-white/30">
                  <Icon icon="solar:gallery-wide-bold" size={20} />
                </div>
              }
              sizes="98px"
              src={tmdbImageUrl("poster", poster, "w185")}
            />
          </div>
        );
      })}
    </div>
  );
}

export function ListCard({
  list,
  ownerEdit,
  username,
}: {
  list: ListCardData;
  ownerEdit?: boolean;
  username: string;
}): JSX.Element {
  const href = `/account/${encodeURIComponent(username)}/lists/${list.slug}`;

  return (
    <article className="group/list relative w-full">
      <AccountLink
        className="block overflow-hidden rounded-[20px] bg-white/5 ring-1 ring-white/5 ring-inset hover:ring-white/20"
        href={href}
      >
        <Fan previews={list.previews} />
        <div className="bg-black/50 px-4 pt-4 pb-3">
          <h3 className="flex items-center gap-2 text-base font-semibold text-white">
            <span className="line-clamp-1">{list.title}</span>
            {list.isPrivate ? (
              <Icon
                className="shrink-0 text-white/50"
                icon="solar:lock-bold"
                size={13}
              />
            ) : null}
          </h3>
          <p
            className={cn(
              "mt-1 line-clamp-2 min-h-8 text-xs",
              list.description ? "text-white/50" : "text-white/30 italic",
            )}
          >
            {list.description || "No description"}
          </p>
        </div>
        <div className="flex h-10 items-center justify-between border-t border-white/5 bg-black/50 px-4 text-xs text-white/60">
          <span className="inline-flex items-center gap-1.5">
            <Icon icon="solar:calendar-mark-bold" size={13} />
            {DATE.format(new Date(list.updatedAt))}
          </span>
          <span className="inline-flex items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <Icon icon="solar:list-broken" size={13} />
              {list.itemsCount}
            </span>
            <span className="inline-flex items-center gap-1">
              <Icon icon="solar:heart-bold" size={13} />
              {list.likesCount}
            </span>
            <span className="inline-flex items-center gap-1">
              <Icon icon="solar:chat-round-bold" size={13} />
              {list.reviewsCount}
            </span>
          </span>
        </div>
      </AccountLink>
      {ownerEdit ? (
        <div className="absolute top-2 right-2 z-20 opacity-0 transition-opacity group-focus-within/list:opacity-100 group-hover/list:opacity-100">
          <EditListButton
            list={{
              description: list.description,
              id: list.id,
              isPrivate: list.isPrivate,
              isRanked: list.isRanked,
              slug: list.slug,
              title: list.title,
            }}
            username={username}
          />
        </div>
      ) : null}
    </article>
  );
}

export const LIST_GRID = "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3";
