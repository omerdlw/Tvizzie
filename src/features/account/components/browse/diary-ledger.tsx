import type { JSX } from "react";
import { movieHref } from "@config/routes";
import { Icon, MediaCard } from "@/ui";
import { RADIUS } from "@/ui/radius";
import { RatingStars } from "@/features/reviews/components/rating-stars";
import type { DiaryRow } from "../../lib/browse-data";
import { AccountLink } from "./account-link";
import { DiaryDeleteButton } from "./diary-delete-button";
import { posterImage } from "./poster";

const DAY = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
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

const COLUMNS =
  "grid grid-cols-[2.75rem_minmax(0,1fr)_auto] items-center gap-x-3 sm:grid-cols-[3.5rem_minmax(0,1fr)_7rem_4.5rem_4.5rem_2.5rem] sm:gap-x-4";

const HEAD =
  "text-[10px] leading-4 font-semibold tracking-[0.14em] text-white/40 uppercase";

function Mark({ on, label }: { on: boolean; label: string }) {
  return on ? (
    <Icon
      aria-label={label}
      className="text-white/70"
      icon="solar:check-circle-bold"
      size={16}
    />
  ) : (
    <span aria-hidden="true" className="text-white/20">
      —
    </span>
  );
}

export function DiaryLedger({
  isOwner,
  rows,
  username,
}: {
  isOwner: boolean;
  rows: readonly DiaryRow[];
  username: string;
}): JSX.Element {
  return (
    <div className="w-full">
      <div
        className={`${COLUMNS} hidden border-b border-white/10 pb-2 sm:grid`}
      >
        <span className={HEAD}>Day</span>
        <span className={HEAD}>Film</span>
        <span className={HEAD}>Rating</span>
        <span className={`${HEAD} text-center`}>Rewatch</span>
        <span className={`${HEAD} text-center`}>Review</span>
        <span />
      </div>
      <ul className="divide-y divide-white/[0.07]">
        {rows.map((row, index) => {
          const same = rows[index - 1]?.watchedOn === row.watchedOn;
          const { day, weekday } = dayOf(row.watchedOn);
          const href = movieHref(row.tmdbId);
          return (
            <li className={`${COLUMNS} py-3`} key={row.id}>
              <time className="flex flex-col" dateTime={row.watchedOn}>
                {same ? null : (
                  <>
                    <span className="text-lg leading-6 font-semibold text-white tabular-nums">
                      {day}
                    </span>
                    <span className="text-[11px] leading-4 text-white/40">
                      {weekday}
                    </span>
                  </>
                )}
              </time>

              <div className="flex min-w-0 items-center gap-3">
                <MediaCard
                  aspect="free"
                  className="w-9 shrink-0"
                  fallbackIcon="solar:clapperboard-play-bold"
                  fallbackIconSize={14}
                  frameClassName="h-[3.25rem] w-9"
                  href={href}
                  image={posterImage(row.posterPath, "36px")}
                  label={row.title}
                  radius={RADIUS.chip}
                />
                <div className="flex min-w-0 flex-col">
                  <AccountLink
                    className="truncate text-sm font-medium text-white hover:underline"
                    href={href}
                  >
                    {row.title}
                  </AccountLink>
                  <span className="flex items-center gap-2 text-xs text-white/40 tabular-nums">
                    {row.year ?? ""}
                    <span className="inline-flex items-center gap-2 sm:hidden">
                      <RatingStars rating={row.rating} size={11} />
                      {row.isRewatch ? (
                        <Icon icon="solar:restart-linear" size={12} />
                      ) : null}
                    </span>
                  </span>
                </div>
              </div>

              <span className="hidden sm:block">
                <RatingStars rating={row.rating} />
              </span>
              <span className="hidden justify-center sm:flex">
                <Mark label="Rewatch" on={row.isRewatch} />
              </span>
              <span className="hidden justify-center sm:flex">
                {row.hasReview ? (
                  <AccountLink
                    aria-label="Read the review"
                    className="text-white/70 hover:text-white"
                    href={`${href}/reviews?user=${encodeURIComponent(username)}`}
                  >
                    <Icon icon="solar:document-text-bold" size={16} />
                  </AccountLink>
                ) : (
                  <Mark label="Review" on={false} />
                )}
              </span>
              <span className="flex justify-end">
                {isOwner ? (
                  <DiaryDeleteButton id={row.id} title={row.title} />
                ) : null}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
