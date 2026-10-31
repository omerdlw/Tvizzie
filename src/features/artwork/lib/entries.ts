import { isTmdbImagePath } from "@/infrastructure/tmdb/images";
import { ARTWORK_MAX_ENTRIES } from "./constants";
import type {
  ArtworkEntries,
  ArtworkEntry,
  ArtworkKind,
  ArtworkSlot,
} from "./types";

const SLOTS: readonly ArtworkSlot[] = ["poster", "backdrop"];

export const EMPTY_ARTWORK: ArtworkEntries = Object.freeze({});

export function artworkKey(kind: ArtworkKind, id: number): string {
  return `${kind}:${id}`;
}

function isKey(key: string): boolean {
  return /^(?:movie|person):[1-9]\d{0,9}$/.test(key);
}

function sanitize(value: unknown): ArtworkEntry | null {
  if (typeof value !== "object" || value === null) return null;
  const raw = value as Record<string, unknown>;
  const entry: ArtworkEntry = {
    updatedAt:
      typeof raw.updatedAt === "number" && Number.isFinite(raw.updatedAt)
        ? raw.updatedAt
        : 0,
  };
  for (const slot of SLOTS) {
    const path = raw[slot];
    if (isTmdbImagePath(path)) entry[slot] = path;
  }
  return entry.poster || entry.backdrop ? entry : null;
}

function prune(entries: Record<string, ArtworkEntry>): ArtworkEntries {
  return Object.fromEntries(
    Object.entries(entries)
      .sort(([, a], [, b]) => b.updatedAt - a.updatedAt)
      .slice(0, ARTWORK_MAX_ENTRIES),
  );
}

export function parseArtwork(raw: string | null): ArtworkEntries {
  if (!raw) return EMPTY_ARTWORK;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return EMPTY_ARTWORK;
    const entries: Record<string, ArtworkEntry> = {};
    for (const [key, value] of Object.entries(parsed)) {
      const entry = isKey(key) ? sanitize(value) : null;
      if (entry) entries[key] = entry;
    }
    return prune(entries);
  } catch {
    return EMPTY_ARTWORK;
  }
}

export function withArtwork(
  entries: ArtworkEntries,
  kind: ArtworkKind,
  id: number,
  slot: ArtworkSlot,
  path: string,
  now: number,
): ArtworkEntries {
  if (!isTmdbImagePath(path)) return entries;
  const key = artworkKey(kind, id);
  return prune({
    ...entries,
    [key]: { ...entries[key], [slot]: path, updatedAt: now },
  });
}

export function withoutArtwork(
  entries: ArtworkEntries,
  kind: ArtworkKind,
  id: number,
  slot?: ArtworkSlot,
): ArtworkEntries {
  const key = artworkKey(kind, id);
  const current = entries[key];
  if (!current || (slot && !current[slot])) return entries;

  const { [key]: _removed, ...rest } = entries;
  if (!slot) return rest;

  const next: ArtworkEntry = { ...current };
  delete next[slot];
  return next.poster || next.backdrop ? { ...rest, [key]: next } : rest;
}

export function resolveArtwork(
  entries: ArtworkEntries,
  kind: ArtworkKind,
  id: number,
  slot: ArtworkSlot,
  fallback: string | null,
): string | null {
  return entries[artworkKey(kind, id)]?.[slot] ?? fallback;
}
