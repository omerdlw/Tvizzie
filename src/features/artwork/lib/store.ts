import { ARTWORK_STORAGE_KEY } from "./constants";
import {
  EMPTY_ARTWORK,
  parseArtwork,
  withArtwork,
  withoutArtwork,
} from "./entries";
import type { ArtworkEntries, ArtworkKind, ArtworkSlot } from "./types";

interface ArtworkStore {
  clear(kind: ArtworkKind, id: number, slot?: ArtworkSlot): void;
  getSnapshot(): ArtworkEntries;
  set(kind: ArtworkKind, id: number, slot: ArtworkSlot, path: string): void;
  subscribe(listener: () => void): () => void;
}

function safely<T>(run: () => T, fallback: T): T {
  try {
    return run();
  } catch {
    return fallback;
  }
}

function createArtworkStore(
  getStorage: () => Storage | null,
  now: () => number = Date.now,
): ArtworkStore {
  const listeners = new Set<() => void>();
  let raw: string | null | undefined;
  let entries: ArtworkEntries = EMPTY_ARTWORK;

  const read = (): ArtworkEntries => {
    const stored = safely(
      () => getStorage()?.getItem(ARTWORK_STORAGE_KEY) ?? null,
      null,
    );
    if (stored !== raw) {
      raw = stored;
      entries = parseArtwork(stored);
    }
    return entries;
  };

  const write = (next: ArtworkEntries) => {
    if (next === entries) return;
    safely(() => {
      const storage = getStorage();
      if (!storage) return;
      if (Object.keys(next).length === 0)
        storage.removeItem(ARTWORK_STORAGE_KEY);
      else storage.setItem(ARTWORK_STORAGE_KEY, JSON.stringify(next));
    }, undefined);
    raw = undefined;
    read();
    listeners.forEach((listener) => listener());
  };

  return {
    clear: (kind, id, slot) => write(withoutArtwork(read(), kind, id, slot)),
    getSnapshot: read,
    set: (kind, id, slot, path) =>
      write(withArtwork(read(), kind, id, slot, path, now())),
    subscribe(listener) {
      listeners.add(listener);
      const onStorage = (event: StorageEvent) => {
        if (event.key === null || event.key === ARTWORK_STORAGE_KEY) listener();
      };
      if (typeof window !== "undefined") {
        window.addEventListener("storage", onStorage);
      }
      return () => {
        listeners.delete(listener);
        if (typeof window !== "undefined") {
          window.removeEventListener("storage", onStorage);
        }
      };
    },
  };
}

export const artworkStore = createArtworkStore(() =>
  typeof window === "undefined" ? null : window.localStorage,
);
