import type { JSX } from "react";
import { movieHref } from "@config/routes";
import { Avatar, Tooltip } from "@/ui";
import { cn } from "@omerdlw/base-framework/utils";
import { RatingStars, Star } from "@/features/reviews/components/rating-stars";
import type { DiaryEntry, PersonPreview } from "../../lib/browse-data";
import { AccountLink } from "./account-link";
import { counted } from "./section";

const MONTH = new Intl.DateTimeFormat("en-US", {
  month: "short",
  timeZone: "UTC",
});

// The latest entries of a diary, under the month they were watched in.
export function DiaryDigest({
  entries,
}: {
  entries: readonly DiaryEntry[];
}): JSX.Element {
  const months: { key: string; entries: DiaryEntry[] }[] = [];
  for (const entry of entries) {
    const key = entry.watchedOn.slice(0, 7);
    const last = months.at(-1);
    if (last?.key === key) last.entries.push(entry);
    else months.push({ entries: [entry], key });
  }

  return (
    <div className="flex flex-col gap-5">
      {months.map((month) => {
        const date = new Date(`${month.key}-01T00:00:00Z`);
        return (
          <div className="flex gap-3" key={month.key}>
            <span className="flex w-9 shrink-0 flex-col items-center self-start overflow-hidden rounded-chip ring-1 ring-white/15 ring-inset">
              <span className="w-full bg-white/10 py-0.5 text-center text-[9px] leading-3 font-semibold tracking-[0.1em] text-white/70 uppercase">
                {MONTH.format(date)}
              </span>
              <span className="py-1 text-[10px] leading-3 text-white/45 tabular-nums">
                {date.getUTCFullYear()}
              </span>
            </span>
            <ol className="flex min-w-0 flex-1 flex-col gap-1">
              {month.entries.map((entry) => (
                <li
                  className="flex min-w-0 items-baseline gap-2.5 text-[13px] leading-5"
                  key={entry.id}
                >
                  <span className="w-5 shrink-0 text-right text-white/35 tabular-nums">
                    {Number(entry.watchedOn.slice(8, 10))}
                  </span>
                  <AccountLink
                    className="truncate text-white/75 transition-colors hover:text-white"
                    href={movieHref(entry.tmdbId)}
                  >
                    {entry.title}
                  </AccountLink>
                </li>
              ))}
            </ol>
          </div>
        );
      })}
    </div>
  );
}

const stars = (value: number) =>
  `${"★".repeat(Math.floor(value))}${value % 1 ? "½" : ""}`;

// How someone's ratings fall from half a star to five.
export function RatingsChart({
  spread,
}: {
  spread: readonly number[];
}): JSX.Element {
  const peak = Math.max(1, ...spread);
  const total = spread.reduce((sum, count) => sum + count, 0);
  const average = total
    ? spread.reduce((sum, count, index) => sum + count * (index + 1), 0) /
      (2 * total)
    : 0;
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-baseline gap-3">
        <span className="text-4xl leading-none font-semibold text-white tabular-nums">
          {average.toFixed(1)}
        </span>
        <span className="flex flex-col gap-1.5">
          <RatingStars rating={Math.round(average * 2) / 2} size={12} />
          <span className="text-[11px] leading-3 text-white/40">
            average rating
          </span>
        </span>
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="flex h-24 items-end gap-1 border-b border-white/10">
          {spread.map((count, index) => (
            <Tooltip
              key={index}
              text={`${stars((index + 1) / 2)} · ${counted(count, "rating")}`}
            >
              <span className="group/bar flex h-full flex-1 items-end">
                {count ? (
                  <span
                    className={cn(
                      "w-full rounded-t-[2px] transition-colors group-hover/bar:bg-white/60",
                      count === peak ? "bg-white/40" : "bg-white/15",
                    )}
                    style={{ height: `max(4px, ${(count / peak) * 100}%)` }}
                  />
                ) : null}
              </span>
            </Tooltip>
          ))}
        </div>
        <div aria-hidden="true" className="flex justify-between">
          <Star fill={1} size={9} />
          <span className="flex gap-px">
            {Array.from({ length: 5 }, (_, index) => (
              <Star fill={1} key={index} size={9} />
            ))}
          </span>
        </div>
      </div>
    </div>
  );
}

export function PeopleGrid({
  people,
}: {
  people: readonly PersonPreview[];
}): JSX.Element {
  return (
    <ul className="grid grid-cols-6 gap-2">
      {people.map((person) => (
        <li key={person.username}>
          <Tooltip text={person.displayName}>
            <AccountLink
              aria-label={person.displayName}
              className="block aspect-square rounded-full ring-1 ring-white/10 transition-opacity hover:opacity-75"
              href={`/account/${encodeURIComponent(person.username)}`}
            >
              <Avatar
                name={person.displayName}
                size="100%"
                src={person.avatarUrl ?? undefined}
              />
            </AccountLink>
          </Tooltip>
        </li>
      ))}
    </ul>
  );
}
