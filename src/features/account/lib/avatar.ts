import type { SyntheticEvent } from "react";
import { trimToNull } from "@omerdlw/base-framework/utils";

interface AvatarSource {
  avatarUrl?: string | null;
  avatar_url?: string | null;
  displayName?: string | null;
  display_name?: string | null;
  username?: string | null;
}

export function getInitial(value: unknown): string {
  const first = trimToNull(value)?.charAt(0).toUpperCase() ?? "";
  return /^[A-Z0-9]$/.test(first) ? first : "A";
}

export function getUserAvatarFallbackUrl(user: AvatarSource = {}): string {
  const initial = getInitial(
    user.displayName || user.display_name || user.username,
  );
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="100%" height="100%"><rect width="200" height="200" fill="#18181b"/><text x="50%" y="52%" text-anchor="middle" dominant-baseline="middle" fill="#ffffff" font-family="ui-sans-serif, system-ui, sans-serif" font-size="82" font-weight="600">${initial}</text></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export function getUserAvatarUrl(user: AvatarSource = {}): string {
  return (
    trimToNull(user.avatarUrl || user.avatar_url) ??
    getUserAvatarFallbackUrl(user)
  );
}

export function applyAvatarFallback(
  event: SyntheticEvent<HTMLImageElement>,
  fallbackUrl: string,
): void {
  const image = event.currentTarget;
  if (image.dataset.avatarFallbackApplied === "true") return;
  image.dataset.avatarFallbackApplied = "true";
  image.src = fallbackUrl;
}
