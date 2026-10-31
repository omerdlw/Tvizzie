import "server-only";

import { unstable_cache } from "next/cache";
import {
  AmbientDecoderMissingError,
  extractAmbientPalette,
  type AmbientPalette,
} from "@omerdlw/base-framework/ambient/server";
import { report } from "@omerdlw/base-framework/utils";
import { TMDB_IMAGE_BASE_URL } from "./constants";

const IMAGE_HOST = new URL(TMDB_IMAGE_BASE_URL).hostname;

const PALETTE_VERSION = "ambient-v2";
const PALETTE_TIMEOUT_MS = 3_000;

class NoPalette extends Error {}

const paletteOf = unstable_cache(
  async (url: string): Promise<AmbientPalette> => {
    const palette = await extractAmbientPalette(url, {
      allow: (target) =>
        target.protocol === "https:" && target.hostname === IMAGE_HOST,
      timeoutMs: PALETTE_TIMEOUT_MS,
    });
    if (!palette) throw new NoPalette(url);
    return palette;
  },
  [PALETTE_VERSION],
);

export async function getAmbientPalette(
  url: string | null,
): Promise<AmbientPalette | null> {
  if (!url) return null;
  try {
    return await paletteOf(url);
  } catch (error) {
    if (error instanceof AmbientDecoderMissingError) report("Ambient", error);
    return null;
  }
}
