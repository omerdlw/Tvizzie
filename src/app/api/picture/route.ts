import { NextResponse } from "next/server";
import { parseMovieId } from "@/features/movie/lib/utils";
import { getBackdropPath, parsePersonId } from "@/features/person/lib/utils";
import {
  checkRateLimitAsync,
  createRateLimitExceededResponse,
  getClientIp,
} from "@/infrastructure/security/rate-limiter";
import {
  getMovieDetails,
  getPersonDetails,
} from "@/infrastructure/tmdb/server";

const CACHE_CONTROL =
  "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800";

// The picture a film page opens on, asked for before the page itself so that
// it is already in hand when the page is cut to.
async function pictureOf(kind: string, raw: string): Promise<string | null> {
  if (kind === "movie") {
    const id = parseMovieId(raw);
    const result = id === null ? null : await getMovieDetails(id);
    return result?.success ? result.data.backdropPath : null;
  }
  const id = parsePersonId(raw);
  const result = id === null ? null : await getPersonDetails(id);
  return result?.success ? getBackdropPath(result.data) : null;
}

export async function GET(request: Request): Promise<Response> {
  const limit = await checkRateLimitAsync(`picture:${getClientIp(request)}`, {
    limit: 120,
    windowMs: 60 * 1000,
  });
  if (!limit.success) return createRateLimitExceededResponse(limit);

  const params = new URL(request.url).searchParams;
  const kind = params.get("kind");
  const id = params.get("id") ?? "";
  if (kind !== "movie" && kind !== "person") {
    return NextResponse.json({ error: "Invalid kind" }, { status: 400 });
  }

  return NextResponse.json(
    { path: await pictureOf(kind, id) },
    { headers: { "Cache-Control": CACHE_CONTROL } },
  );
}
