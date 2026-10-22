import type { JSX, ReactNode } from "react";
import { cn } from "@omerdlw/base-framework/utils";
import { movieHref } from "@config/routes";
import { Icon, MediaCard } from "@/ui";
import { RADIUS } from "@/ui/radius";
import type { ActivityItem } from "../../lib/browse-data";
import { AccountLink } from "./account-link";
import { posterImage } from "./poster";
import { RatingStars } from "@/features/reviews/components/rating-stars";
import { timeAgo } from "../../lib/dates";

const ICONS: Record<string, string> = {
  FOLLOW_CREATED: "solar:user-plus-bold",
  LIKED_ADDED: "solar:heart-bold",
  LIST_COMMENTED: "solar:chat-round-bold",
  LIST_CREATED: "solar:list-bold",
  LIST_LIKED: "solar:heart-bold",
  RATING_LOGGED: "solar:star-bold",
  REVIEW_LIKED: "solar:heart-bold",
  REVIEW_PUBLISHED: "solar:chat-round-bold",
  WATCH_DIARY_LOGGED: "solar:calendar-mark-bold",
  WATCH_DIARY_REWATCHED: "solar:restart-bold",
  WATCHED_ADDED: "solar:eye-bold",
  WATCHLIST_ADDED: "solar:bookmark-bold",
};

const strong = "font-medium text-white hover:underline";

function sentence(item: ActivityItem): ReactNode {
  const movie = item.tmdbId ? (
    <AccountLink className={strong} href={movieHref(item.tmdbId)}>
      {item.title ?? "a movie"}
    </AccountLink>
  ) : (
    <span className="font-medium text-white">{item.title ?? "a movie"}</span>
  );
  const list =
    item.list && item.listOwner ? (
      <AccountLink
        className={strong}
        href={`/account/${encodeURIComponent(item.listOwner)}/lists/${item.list.slug}`}
      >
        {item.list.title}
      </AccountLink>
    ) : (
      <span className="font-medium text-white">
        {item.list?.title ?? "a list"}
      </span>
    );
  const target = item.target ? (
    <AccountLink
      className={strong}
      href={`/account/${encodeURIComponent(item.target.username)}`}
    >
      {item.target.displayName}
    </AccountLink>
  ) : (
    <span>someone</span>
  );
  const stars = item.rating ? (
    <RatingStars className="mx-1" rating={item.rating} />
  ) : null;

  switch (item.type) {
    case "WATCH_DIARY_LOGGED":
      return <>logged {movie}</>;
    case "WATCH_DIARY_REWATCHED":
      return <>rewatched {movie}</>;
    case "WATCHED_ADDED":
      return <>marked {movie} as watched</>;
    case "WATCHLIST_ADDED":
      return <>added {movie} to the watchlist</>;
    case "LIKED_ADDED":
      return <>liked {movie}</>;
    case "REVIEW_PUBLISHED":
      return (
        <>
          reviewed {movie}
          {stars}
        </>
      );
    case "RATING_LOGGED":
      return (
        <>
          rated {movie}
          {stars}
        </>
      );
    case "REVIEW_LIKED":
      return item.tmdbId ? (
        <>liked a review of {movie}</>
      ) : (
        <>liked a comment on {list}</>
      );
    case "LIST_CREATED":
      return <>created the list {list}</>;
    case "LIST_LIKED":
      return (
        <>
          liked the list {list} by {target}
        </>
      );
    case "LIST_COMMENTED":
      return (
        <>
          commented on {list} by {target}
        </>
      );
    case "FOLLOW_CREATED":
      return <>started following {target}</>;
    default:
      return <>did something</>;
  }
}

export function ActivityRow({
  actor,
  item,
}: {
  actor: { displayName: string; username: string };
  item: ActivityItem;
}): JSX.Element {
  return (
    <li className="flex items-center gap-3 py-3.5 sm:gap-4">
      {item.tmdbId ? (
        <MediaCard
          aspect="free"
          className="w-9 shrink-0"
          fallbackIcon="solar:clapperboard-play-bold"
          fallbackIconSize={14}
          frameClassName="h-[3.25rem] w-9"
          href={movieHref(item.tmdbId)}
          image={posterImage(item.posterPath, "36px")}
          label={item.title ?? "Movie"}
          radius={RADIUS.chip}
        />
      ) : (
        <span className="center size-9 shrink-0 rounded-chip bg-white/[0.06] text-white/60">
          <Icon icon={ICONS[item.type] ?? "solar:bolt-bold"} size={15} />
        </span>
      )}
      <p className="min-w-0 flex-1 text-sm leading-6 text-white/60">
        <AccountLink
          className={strong}
          href={`/account/${encodeURIComponent(actor.username)}`}
        >
          {actor.displayName}
        </AccountLink>{" "}
        {sentence(item)}
      </p>
      <time
        className="shrink-0 text-xs text-white/40 tabular-nums"
        dateTime={item.createdAt}
      >
        {timeAgo(item.createdAt)}
      </time>
    </li>
  );
}

// The last few things someone did, as a running log down the side of their
// profile.
export function ActivityFeed({
  actor,
  items,
}: {
  actor: { displayName: string; username: string };
  items: readonly ActivityItem[];
}): JSX.Element {
  return (
    <ol className="flex flex-col">
      {items.map((item) => (
        <li
          className="relative border-l border-white/10 pb-4 pl-4 text-[13px] leading-5 text-white/55 last:border-transparent last:pb-0"
          key={item.id}
        >
          <span
            aria-hidden="true"
            className="absolute top-1.5 -left-[3.5px] size-1.5 rounded-full bg-white/40"
          />
          <span className="font-medium text-white/85">{actor.displayName}</span>{" "}
          {sentence(item)}{" "}
          <time
            className="text-xs whitespace-nowrap text-white/35 tabular-nums"
            dateTime={item.createdAt}
          >
            {timeAgo(item.createdAt)}
          </time>
        </li>
      ))}
    </ol>
  );
}

export function ActivityLog({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <ul className={cn("divide-y divide-white/[0.07]", className)}>
      {children}
    </ul>
  );
}
