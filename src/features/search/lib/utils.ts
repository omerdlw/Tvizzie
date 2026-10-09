import { SEARCH_MAX_QUERY_LENGTH, SEARCH_MIN_QUERY_LENGTH } from "./constants";

export function normalizeQuery(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function isSearchable(query: string): boolean {
  return (
    query.length >= SEARCH_MIN_QUERY_LENGTH &&
    query.length <= SEARCH_MAX_QUERY_LENGTH
  );
}

export function userHref(username: string): string {
  return `/account/${encodeURIComponent(username)}`;
}

export function listHref(owner: string, slug: string): string {
  return `${userHref(owner)}/lists/${encodeURIComponent(slug)}`;
}

export function reviewHref(tmdbId: number, username: string): string {
  return `/movie/${tmdbId}/reviews?user=${encodeURIComponent(username)}`;
}

export function matchRank(
  text: string | null | undefined,
  query: string,
): number {
  const haystack = (text ?? "").toLowerCase();
  const needle = query.toLowerCase();
  if (!needle || !haystack) return 4;
  if (haystack === needle) return 0;
  if (haystack.startsWith(needle)) return 1;
  if (haystack.includes(` ${needle}`)) return 2;
  return haystack.includes(needle) ? 3 : 4;
}

export function excerpt(text: string, query: string, max = 140): string {
  const flat = text.replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;

  const at = flat.toLowerCase().indexOf(query.toLowerCase());
  const start =
    at < 0
      ? 0
      : Math.max(0, Math.min(at - Math.floor(max / 4), flat.length - max));
  const end = start + max;
  return `${start > 0 ? "…" : ""}${flat.slice(start, end).trim()}${end < flat.length ? "…" : ""}`;
}
