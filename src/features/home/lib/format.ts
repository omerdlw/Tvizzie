const COMPACT = new Intl.NumberFormat("en", {
  maximumFractionDigits: 1,
  notation: "compact",
});

export const compact = (value: number) => COMPACT.format(value);

export const whole = (value: number) => value.toLocaleString("en-US");

const RELEASE = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

export const releaseDay = (iso: string) =>
  RELEASE.format(new Date(`${iso}T12:00:00Z`));

const AGO = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
const STEPS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["minute", 60],
  ["hour", 24],
  ["day", 7],
  ["week", 4.35],
  ["month", 12],
];

export function ago(iso: string, now = Date.now()): string {
  let value = (new Date(iso).getTime() - now) / 60_000;
  for (const [unit, next] of STEPS) {
    if (Math.abs(value) < next) return AGO.format(Math.round(value), unit);
    value /= next;
  }
  return AGO.format(Math.round(value), "year");
}
