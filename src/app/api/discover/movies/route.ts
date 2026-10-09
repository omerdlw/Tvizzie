import { NextResponse } from "next/server";
import {
  DISCOVER_DECADES,
  DISCOVER_GENRES,
} from "@/features/home/lib/constants";
import { getDiscoverPage } from "@/features/home/server/feed";
import { apiErrorResponse } from "@/infrastructure/http/api-error";
import {
  checkRateLimitAsync,
  createRateLimitExceededResponse,
  getClientIp,
} from "@/infrastructure/security/rate-limiter";
import {
  DISCOVER_SORTS,
  type DiscoverSort,
} from "@/infrastructure/tmdb/discover";

const CACHE_CONTROL =
  "public, max-age=300, s-maxage=1800, stale-while-revalidate=86400";

const GENRES = new Set(DISCOVER_GENRES.map((genre) => genre.id));
const DECADES = new Set(
  DISCOVER_DECADES.flatMap((d) => (d.value ? [d.value] : [])),
);

export async function GET(request: Request): Promise<Response> {
  const limit = await checkRateLimitAsync(`discover:${getClientIp(request)}`, {
    limit: 60,
    windowMs: 60 * 1000,
  });
  if (!limit.success) return createRateLimitExceededResponse(limit);

  const params = new URL(request.url).searchParams;
  const genre = params.has("genre") ? Number(params.get("genre")) : null;
  const decade = params.has("decade") ? Number(params.get("decade")) : null;
  const sort = (params.get("sort") ?? "popularity.desc") as DiscoverSort;
  const page = params.has("page") ? Number(params.get("page")) : 1;

  if (
    (genre !== null && !GENRES.has(genre)) ||
    (decade !== null && !DECADES.has(decade)) ||
    !DISCOVER_SORTS.includes(sort) ||
    !Number.isInteger(page) ||
    page < 1 ||
    page > 20
  ) {
    return NextResponse.json({ error: "Invalid filters" }, { status: 400 });
  }

  const result = await getDiscoverPage({ decade, genre, page, sort });
  if (!result.success) {
    return apiErrorResponse(result.error, { status: 503 });
  }
  return NextResponse.json(
    { data: result.data },
    { headers: { "Cache-Control": CACHE_CONTROL } },
  );
}
