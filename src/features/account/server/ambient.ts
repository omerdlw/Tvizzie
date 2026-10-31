import "server-only";

import { unstable_cache } from "next/cache";
import { after } from "next/server";
import {
  AmbientDecoderMissingError,
  extractAmbientPalette,
  type AmbientPalette,
} from "@omerdlw/base-framework/ambient/server";
import { report } from "@omerdlw/base-framework/utils";
import { isPublicHttps, pinnedFetch } from "@/infrastructure/http/pinned-fetch";

const PALETTE_VERSION = "account-ambient-v1";
const PALETTE_TIMEOUT_MS = 3_000;
const PALETTE_MAX_BYTES = 8 * 1024 * 1024;

class NoPalette extends Error {}

const paletteOf = unstable_cache(
  async (url: string): Promise<AmbientPalette> => {
    const palette = await extractAmbientPalette(url, {
      allow: isPublicHttps,
      fetch: pinnedFetch,
      maxBytes: PALETTE_MAX_BYTES,
      timeoutMs: PALETTE_TIMEOUT_MS,
    });
    if (!palette) throw new NoPalette(url);
    return palette;
  },
  [PALETTE_VERSION],
  { revalidate: 60 * 60 * 24 * 7 },
);

const TMDB_IMAGE = /^(https:\/\/image\.tmdb\.org\/t\/p\/)[^/]+(\/[^/]+)$/i;

const PALETTE_BUDGET_MS = 600;

export async function getAccountAmbientPalette(
  url: string | null | undefined,
): Promise<AmbientPalette | null> {
  if (!url || !/^https:\/\//i.test(url)) return null;

  const reading = paletteOf(url.replace(TMDB_IMAGE, "$1w300$2")).then(
    (palette): AmbientPalette => ({ ...palette, source: url }),
    (error) => {
      if (error instanceof AmbientDecoderMissingError) report("Ambient", error);
      return null;
    },
  );

  let timer: ReturnType<typeof setTimeout> | undefined;
  const late = new Promise<"late">((resolve) => {
    timer = setTimeout(resolve, PALETTE_BUDGET_MS, "late");
  });
  const palette = await Promise.race([reading, late]);
  clearTimeout(timer);

  if (palette !== "late") return palette;
  after(() => reading);
  return null;
}
