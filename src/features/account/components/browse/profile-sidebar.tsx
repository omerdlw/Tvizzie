import type { JSX } from "react";
import { movieHref } from "@config/routes";
import { Avatar, Tooltip } from "@/ui";
import { Star } from "@/features/reviews/components/rating-stars";
import type { DiaryEntry, PersonPreview } from "../../lib/browse-data";
import { AccountLink } from "./account-link";
import { counted } from "./section";

export interface ProfileStat {
  count: number;
  href: string;
  label: string;
}

export function ProfileStats({
  stats,
}: {
  stats: readonly ProfileStat[];
}): JSX.Element {
  return (
    <ul className="grid grid-cols-4 divide-x divide-white/10 overflow-hidden rounded-xl ring-1 ring-white/10 ring-inset sm:col-span-2 lg:col-span-1">
      {stats.map((stat) => (
        <li className="flex" key={stat.label}>
          <AccountLink
            className="flex w-full flex-col items-center gap-1 px-1 py-3.5 transition-colors hover:bg-white/[0.04]"
            href={stat.href}
          >
            <span className="text-lg leading-6 font-semibold text-white tabular-nums">
              {stat.count.toLocaleString("en-US")}
            </span>
            <span className="text-[10px] leading-3 font-semibold tracking-[0.1em] whitespace-nowrap text-white/40 uppercase">
              {stat.label}
            </span>
          </AccountLink>
        </li>
      ))}
    </ul>
  );
}

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
    <div className="flex flex-col gap-4">
      {months.map((month) => {
        const date = new Date(`${month.key}-01T00:00:00Z`);
        return (
          <div className="flex gap-3" key={month.key}>
            <span className="flex w-9 shrink-0 flex-col items-center self-start overflow-hidden rounded-[4px] ring-1 ring-white/15 ring-inset">
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
  return (
    <div className="flex items-end gap-2">
      <Star className="mb-px" fill={1} size={10} />
      <div className="flex h-16 flex-1 items-end gap-[3px]">
        {spread.map((count, index) => (
          <Tooltip
            key={index}
            text={`${stars((index + 1) / 2)} · ${counted(count, "rating")}`}
          >
            <span className="group/bar flex h-full flex-1 items-end">
              <span
                className="w-full rounded-t-[2px] bg-white/20 transition-colors group-hover/bar:bg-white/50"
                style={{
                  height: count ? `max(4px, ${(count / peak) * 100}%)` : "1px",
                }}
              />
            </span>
          </Tooltip>
        ))}
      </div>
      <span aria-hidden="true" className="mb-px flex gap-px">
        {Array.from({ length: 5 }, (_, index) => (
          <Star fill={1} key={index} size={8} />
        ))}
      </span>
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
