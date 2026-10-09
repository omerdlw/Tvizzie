import type { JSX, ReactNode } from "react";
import { movieHref } from "@config/routes";
import { Icon, MediaCard } from "@/ui";
import type { ActivityItem } from "../../lib/browse-data";
import { AccountLink } from "./account-link";
import { posterImage } from "./poster";
import { RatingStars } from "@/features/reviews/components/rating-stars";

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

const strong = "font-semibold text-white hover:underline";

function ago(value: string): string {
  const minutes = Math.max(
    0,
    Math.floor((Date.now() - new Date(value).getTime()) / 60_000),
  );
  if (!Number.isFinite(minutes)) return "";
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d`;
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: days > 330 ? "numeric" : undefined,
  }).format(new Date(value));
}

function sentence(item: ActivityItem): ReactNode {
  const movie = item.tmdbId ? (
    <AccountLink className={strong} href={movieHref(item.tmdbId)}>
      {item.title ?? "a movie"}
    </AccountLink>
  ) : (
    <span className="font-semibold text-white">{item.title ?? "a movie"}</span>
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
      <span className="font-semibold text-white">
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
    <div className="flex items-center gap-3 rounded-[20px] bg-white/5 p-3 ring-1 ring-white/5 ring-inset hover:bg-white/10 hover:ring-white/10 sm:gap-4 sm:p-3.5">
      {item.tmdbId ? (
        <MediaCard
          aspect="free"
          className="w-10 shrink-0"
          fallbackIcon="solar:clapperboard-play-bold"
          fallbackIconSize={16}
          frameClassName="h-14 w-10"
          framed={false}
          href={movieHref(item.tmdbId)}
          image={posterImage(item.posterPath, "40px")}
          label={item.title ?? "Movie"}
          radius={10}
        />
      ) : (
        <div className="center size-10 shrink-0 rounded-xl bg-white/5 text-white/50 ring-1 ring-white/5 ring-inset">
          <Icon icon={ICONS[item.type] ?? "solar:bolt-bold"} size={18} />
        </div>
      )}
      <p className="min-w-0 flex-1 text-xs leading-relaxed text-white/70 sm:text-sm">
        <AccountLink
          className={strong}
          href={`/account/${encodeURIComponent(actor.username)}`}
        >
          {actor.displayName}
        </AccountLink>{" "}
        {sentence(item)}
      </p>
      <span className="shrink-0 text-xs font-semibold text-white/40">
        {ago(item.createdAt)}
      </span>
    </div>
  );
}
