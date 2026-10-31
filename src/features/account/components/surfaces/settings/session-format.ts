import type { AuthSession } from "./use-security";

const DEVICES: [RegExp, string, "desktop" | "mobile" | "tablet"][] = [
  [/iPhone/i, "iPhone", "mobile"],
  [/iPad/i, "iPad", "tablet"],
  [/Android.*Mobile/i, "Android", "mobile"],
  [/Android/i, "Android tablet", "tablet"],
  [/Macintosh|Mac OS X/i, "macOS", "desktop"],
  [/Windows/i, "Windows", "desktop"],
  [/CrOS/i, "Chromebook", "desktop"],
  [/Linux/i, "Linux", "desktop"],
];

const BROWSERS: [(userAgent: string) => boolean, string][] = [
  [(ua) => /Arc\//i.test(ua), "Arc"],
  [(ua) => /Edg\//i.test(ua), "Edge"],
  [(ua) => /OPR\/|Opera/i.test(ua), "Opera"],
  [(ua) => /Brave/i.test(ua), "Brave"],
  [(ua) => /Vivaldi/i.test(ua), "Vivaldi"],
  [(ua) => /SamsungBrowser/i.test(ua), "Samsung Internet"],
  [(ua) => /CriOS\//i.test(ua), "Chrome"],
  [(ua) => /FxiOS\//i.test(ua), "Firefox"],
  [(ua) => /Chrome\//i.test(ua) && !/Chromium/i.test(ua), "Chrome"],
  [(ua) => /Firefox\//i.test(ua), "Firefox"],
  [
    (ua) =>
      /Version\/[0-9.]+.*Safari/i.test(ua) ||
      (/Safari/i.test(ua) && /Apple/i.test(ua)),
    "Safari",
  ],
];

export function describeDevice(userAgent: string | null): {
  icon: string;
  title: string;
} {
  if (!userAgent) {
    return { icon: "solar:monitor-smartphone-bold", title: "Unknown session" };
  }
  const [, label, kind] = DEVICES.find(([pattern]) =>
    pattern.test(userAgent),
  ) ?? [null, "Desktop", "desktop"];
  const browser =
    BROWSERS.find(([matches]) => matches(userAgent))?.[1] ?? "Web browser";
  const icon =
    kind === "mobile"
      ? "solar:smartphone-bold"
      : kind === "tablet"
        ? "solar:tablet-bold"
        : label === "Windows" || label === "Linux"
          ? "solar:monitor-bold"
          : "solar:laptop-minimalistic-bold";
  return { icon, title: `${browser} on ${label}` };
}

const LOCALHOST = new Set(["::1", "127.0.0.1", "::ffff:127.0.0.1"]);

const SHORT_DATE = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
});

function describeActivity(session: AuthSession): string {
  if (session.is_current) return "Active now";
  const value = session.last_seen_at || session.created_at;
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "Active session";

  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "Active just now";
  if (seconds < 3600)
    return `Active ${Math.max(1, Math.floor(seconds / 60))}m ago`;
  if (seconds < 86400) return `Active ${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `Active ${Math.floor(seconds / 86400)}d ago`;
  return `Active ${SHORT_DATE.format(date)}`;
}

export function describeSession(session: AuthSession): string {
  const ip = session.ip_address?.trim();
  const place = ip ? (LOCALHOST.has(ip) ? "Localhost" : ip) : null;
  return [place, describeActivity(session)].filter(Boolean).join(" • ");
}
