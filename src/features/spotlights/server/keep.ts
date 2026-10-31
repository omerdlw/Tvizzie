import "server-only";

import { after } from "next/server";
import { report } from "@omerdlw/base-framework/utils";
import { getRedisClient } from "@/infrastructure/redis";

// Each spotlight is a hundred-odd TMDB lookups that change only when TMDB
// fixes a poster, so the assembled list is kept in Redis: fresh for a day,
// then served stale for a week while one request rebuilds it after its
// response has gone out.
const FRESH_MS = 24 * 60 * 60_000;
const KEEP_SECONDS = 7 * 24 * 60 * 60;

interface Kept<T> {
  at: number;
  value: T;
}

const building = new Map<string, Promise<unknown>>();

function build<T>(key: string, make: () => Promise<T>): Promise<T> {
  const running = building.get(key) as Promise<T> | undefined;
  if (running) return running;
  const run = make()
    .then(async (value) => {
      const redis = getRedisClient();
      // An empty list means TMDB was down; never keep that for a week.
      if (redis && (!Array.isArray(value) || value.length > 0)) {
        const entry: Kept<T> = { at: Date.now(), value };
        await redis
          .set(key, entry, { ex: KEEP_SECONDS })
          .catch((error: unknown) => report(`Spotlight ${key} write`, error));
      }
      return value;
    })
    .finally(() => building.delete(key));
  building.set(key, run);
  return run;
}

export async function kept<T>(key: string, make: () => Promise<T>): Promise<T> {
  const redis = getRedisClient();
  if (redis) {
    try {
      const entry = await redis.get<Kept<T>>(key);
      if (entry) {
        if (Date.now() - entry.at > FRESH_MS) {
          after(() =>
            build(key, make).catch((error: unknown) =>
              report(`Spotlight ${key} refresh`, error),
            ),
          );
        }
        return entry.value;
      }
    } catch (error) {
      report(`Spotlight ${key} read`, error);
    }
  }
  return build(key, make);
}

/** Runs lookups a batch at a time so a cold build never floods TMDB. */
export async function batched<T, R>(
  items: readonly T[],
  size: number,
  run: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const out: R[] = [];
  for (let from = 0; from < items.length; from += size) {
    const batch = items.slice(from, from + size);
    out.push(
      ...(await Promise.all(batch.map((item, i) => run(item, from + i)))),
    );
  }
  return out;
}

const LOGLINE_LENGTH = 200;

export function loglineOf(overview: string | null | undefined): string | null {
  const flat = overview?.replace(/\s+/g, " ").trim();
  if (!flat) return null;
  const sentences = flat.match(/.+?[.!?](?=\s+["“‘']?[A-Z]|$)|.+$/g) ?? [flat];
  let line = "";
  for (const sentence of sentences) {
    const next = `${line} ${sentence.trim()}`.trim();
    if (line && next.length > LOGLINE_LENGTH) break;
    line = next;
    if (line.length >= 90) break;
  }
  if (line.length <= LOGLINE_LENGTH) return line;
  return `${line.slice(0, LOGLINE_LENGTH).replace(/\s+\S*$/, "")}…`;
}
