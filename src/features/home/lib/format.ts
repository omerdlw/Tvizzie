const day = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  timeZone: "UTC",
});
const monthDay = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

// "Oct 5 – 11", or "Sep 29 – Oct 5" when the week crosses a month.
export function formatWeek({ from, to }: { from: string; to: string }): string {
  const start = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  const sameMonth = start.getUTCMonth() === end.getUTCMonth();
  return `${monthDay.format(start)} – ${(sameMonth ? day : monthDay).format(end)}`;
}

export const rankLabel = (rank: number) => String(rank).padStart(2, "0");

const shortDay = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});
const longDay = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
  weekday: "short",
});
const atNoon = (iso: string) => new Date(`${iso}T12:00:00Z`);

// "Oct 24"
export const formatDay = (iso: string) => shortDay.format(atNoon(iso));
// "Sat, Oct 11"
export const formatToday = (iso: string) => longDay.format(atNoon(iso));

// "tomorrow", "in 13 days"
export function untilLabel(iso: string, today: string): string {
  const days = Math.round(
    (atNoon(iso).getTime() - atNoon(today).getTime()) / 86_400_000,
  );
  if (days <= 0) return "today";
  if (days === 1) return "tomorrow";
  return `in ${days} days`;
}

const DAY_MS = 86_400_000;
const weekdayName = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  weekday: "long",
});
const monthName = new Intl.DateTimeFormat("en-US", {
  month: "long",
  timeZone: "UTC",
});

// Every weekday from Sunday and every month from January, by name.
export const WEEKDAY_NAMES = Array.from({ length: 7 }, (_, day) =>
  weekdayName.format(new Date(Date.UTC(2023, 0, 1 + day, 12))),
);
export const MONTH_NAMES = Array.from({ length: 12 }, (_, month) =>
  monthName.format(new Date(Date.UTC(2023, month, 1, 12))),
);

// The calendar a number of days from today: 11 October, a Saturday, with the
// weekday and month as indices into the lists above.
export function calendarDay(today: string, offset: number) {
  const date = new Date(atNoon(today).getTime() + offset * DAY_MS);
  return {
    date: date.getUTCDate(),
    month: date.getUTCMonth(),
    weekday: date.getUTCDay(),
  };
}

// "today", "yesterday", "12 days ago", "tomorrow", "in 12 days"
export function relativeDay(offset: number): string {
  if (offset === 0) return "Today";
  if (offset === -1) return "Yesterday";
  if (offset === 1) return "Tomorrow";
  return offset < 0 ? `${-offset} days ago` : `In ${offset} days`;
}

// Whole days from one ISO date to another.
export const daysBetween = (from: string, to: string) =>
  Math.round((atNoon(to).getTime() - atNoon(from).getTime()) / DAY_MS);
