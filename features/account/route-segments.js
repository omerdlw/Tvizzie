export const ACCOUNT_SECTION_KEYS = Object.freeze(['activity', 'likes', 'watched', 'watchlist', 'reviews', 'lists']);

export const RESERVED_ACCOUNT_SEGMENTS = new Set([...ACCOUNT_SECTION_KEYS, 'edit']);

export function isReservedAccountSegment(value) {
  return RESERVED_ACCOUNT_SEGMENTS.has(
    String(value || '')
      .trim()
      .toLowerCase()
  );
}
