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

// A profile's picture is any public address its owner pasted, so the browser
// can seldom read it for its colours (most hosts send no CORS headers, and the
// image proxy is TMDB's alone). The server reads it instead, through the
// framework's guard (public hosts only, every name resolved and every redirect
// checked hop by hop, small and quick) and two of its own: https on every hop,
// and the connection made to the very address that was checked.
const PALETTE_VERSION = "account-ambient-v1";
const PALETTE_TIMEOUT_MS = 3_000;
const PALETTE_MAX_BYTES = 8 * 1024 * 1024;

class NoPalette extends Error {}

// The picture behind an address seldom changes; a new one is a new address.
// A picture that cannot be read is not kept: it is tried again next time.
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

// A TMDB picture is read from a small rendition: the colours are the same, and
// the original backdrop can be megabytes.
const TMDB_IMAGE = /^(https:\/\/image\.tmdb\.org\/t\/p\/)[^/]+(\/[^/]+)$/i;

// A first visit waits this long for the colours at most. Past it the page goes
// without them and the reading finishes after the response, kept for the next.
const PALETTE_BUDGET_MS = 600;

export async function getAccountAmbientPalette(
  url: string | null | undefined,
): Promise<AmbientPalette | null> {
  if (!url || !/^https:\/\//i.test(url)) return null;

  // Keyed to the address as the page holds it, so the page knows it as its own.
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
