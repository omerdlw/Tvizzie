import type { JSX } from "react";
import { movieHref } from "@config/routes";
import { Icon, MediaCard } from "@/ui";
import type { DiaryRow } from "../../lib/browse-data";
import { AccountLink } from "./account-link";
import { DiaryDeleteButton } from "./diary-delete-button";
import { posterImage } from "./poster";
import { RatingStars } from "@/features/reviews/components/rating-stars";

const DAY = new Intl.DateTimeFormat("en-US", {
  day: "2-digit",
  timeZone: "UTC",
  weekday: "short",
});

function dayOf(value: string) {
  const parts = DAY.formatToParts(new Date(`${value}T00:00:00Z`));
  return {
    day: parts.find((part) => part.type === "day")?.value ?? "",
    weekday: parts.find((part) => part.type === "weekday")?.value ?? "",
  };
}

function Title({ row }: { row: DiaryRow }): JSX.Element {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <MediaCard
        aspect="free"
        className="w-9 shrink-0"
        fallbackIcon="solar:clapperboard-play-bold"
        fallbackIconSize={14}
        frameClassName="h-[3.25rem] w-9"
        framed={false}
        href={movieHref(row.tmdbId)}
        image={posterImage(row.posterPath, "36px")}
        label={row.title}
        radius={8}
      />
      <div className="min-w-0">
        <AccountLink
          className="block truncate text-sm font-semibold text-white hover:underline"
          href={movieHref(row.tmdbId)}
        >
          {row.title}
        </AccountLink>
        {row.year ? <p className="text-xs text-white/40">{row.year}</p> : null}
      </div>
    </div>
  );
}

function Marks({
  row,
  username,
}: {
  row: DiaryRow;
  username: string;
}): JSX.Element {
  return (
    <>
      <span title={row.isRewatch ? "Rewatch" : undefined}>
        {row.isRewatch ? (
          <Icon className="text-white/70" icon="solar:restart-bold" size={15} />
        ) : (
          <span className="text-white/30">—</span>
        )}
      </span>
      <span>
        {row.hasReview ? (
          <AccountLink
            aria-label="Read the review"
            href={`${movieHref(row.tmdbId)}/reviews?user=${encodeURIComponent(username)}`}
            title="Read the review"
          >
            <Icon
              className="text-white/70 hover:text-white"
              icon="solar:document-text-bold"
              size={15}
            />
          </AccountLink>
        ) : (
          <span className="text-white/30">—</span>
        )}
      </span>
    </>
  );
}

export function DiaryLedger({
  isOwner,
  username,
  rows,
}: {
  isOwner: boolean;
  username: string;
  rows: readonly DiaryRow[];
}): JSX.Element {
  const cells = rows.map((row, index) => {
    const same = rows[index - 1]?.watchedOn === row.watchedOn;
    return { ...dayOf(row.watchedOn), row, same };
  });

  return (
    <div className="overflow-hidden rounded-[20px] bg-white/5 ring-1 ring-white/5 ring-inset">
      <div
        className="hidden grid-cols-[4.5rem_minmax(0,1fr)_7rem_4rem_4rem_2.5rem] items-center gap-x-4 border-b border-white/5 px-4 py-3 text-xs font-semibold text-white/50 uppercase sm:grid"
        role="row"
      >
        <span>Day</span>
        <span>Film</span>
        <span>Rating</span>
        <span className="text-center">Rewatch</span>
        <span className="text-center">Review</span>
        <span />
      </div>
      <ul className="divide-y divide-white/5">
        {cells.map(({ day, row, same, weekday }) => (
          <li
            className="grid grid-cols-[3rem_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 px-4 py-3 hover:bg-white/5 sm:grid-cols-[4.5rem_minmax(0,1fr)_7rem_4rem_4rem_2.5rem] sm:gap-x-4"
            key={row.id}
          >
            <time
              className="font-mono text-xs text-white/50"
              dateTime={row.watchedOn}
            >
              {same ? null : (
                <>
                  <span className="block text-sm font-semibold text-white">
                    {day}
                  </span>
                  {weekday}
                </>
              )}
            </time>
            <Title row={row} />
            <span className="hidden sm:block">
              <RatingStars rating={row.rating} />
            </span>
            <span className="hidden justify-center sm:flex">
              <Marks row={row} username={username} />
            </span>
            <span className="flex items-center justify-end gap-2.5 sm:hidden">
              <RatingStars rating={row.rating} size={11} />
              {row.isRewatch ? (
                <Icon
                  className="text-white/70"
                  icon="solar:restart-bold"
                  size={14}
                />
              ) : null}
              {isOwner ? (
                <DiaryDeleteButton id={row.id} title={row.title} />
              ) : null}
            </span>
            <span className="hidden justify-end sm:flex">
              {isOwner ? (
                <DiaryDeleteButton id={row.id} title={row.title} />
              ) : null}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
