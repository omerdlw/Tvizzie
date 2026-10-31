const SHORT = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
  year: "numeric",
});

const valid = (value?: string | null): Date | null => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export function formatShortDate(value?: string | null): string {
  const date = valid(value);
  return date ? SHORT.format(date) : "";
}

export function timeAgo(value: string): string {
  const date = valid(value);
  if (!date) return "";
  const minutes = Math.max(
    0,
    Math.floor((Date.now() - date.getTime()) / 60_000),
  );
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d`;
  return formatShortDate(value);
}
