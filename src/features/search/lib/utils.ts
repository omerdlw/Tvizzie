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
