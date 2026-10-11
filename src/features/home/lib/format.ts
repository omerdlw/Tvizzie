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
