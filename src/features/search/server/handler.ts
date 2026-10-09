import { NextResponse } from "next/server";
import { COMMUNITY_SEARCH_TYPES } from "@/features/search/lib/constants";
import type {
  SearchFailure,
  SearchFailureCode,
  SearchResponse,
  SearchType,
} from "@/features/search/lib/types";
import {
  checkRateLimitAsync,
  createRateLimitExceededResponse,
  getClientIp,
} from "@/infrastructure/security/rate-limiter";
import type { Result } from "@omerdlw/base-framework/result";

const STATUS: Record<SearchFailureCode, number> = {
  aborted: 499,
  invalid_query: 400,
  rate_limited: 429,
  unavailable: 503,
};

const PUBLIC_CACHE_CONTROL =
  "public, max-age=60, s-maxage=3600, stale-while-revalidate=86400";
const PRIVATE_CACHE_CONTROL = "private, max-age=30";

type Search = (
  query: string,
  options: { page: number; signal: AbortSignal },
) => Promise<Result<SearchResponse<unknown>, SearchFailure>>;

export function createSearchHandler(type: SearchType, search: Search) {
  const cacheControl = COMMUNITY_SEARCH_TYPES.includes(type)
    ? PRIVATE_CACHE_CONTROL
    : PUBLIC_CACHE_CONTROL;

  return async function GET(request: Request): Promise<Response> {
    const rateLimit = await checkRateLimitAsync(
      `search:${type}:${getClientIp(request)}`,
      { limit: 60, windowMs: 60 * 1000 },
    );
    if (!rateLimit.success) return createRateLimitExceededResponse(rateLimit);

    const { searchParams } = new URL(request.url);
    const page = searchParams.has("page")
      ? Number(searchParams.get("page"))
      : 1;

    const result = await search(searchParams.get("q") ?? "", {
      page,
      signal: request.signal,
    });

    if (!result.success) {
      return NextResponse.json(
        { code: result.error.code, error: result.error.message },
        { status: STATUS[result.error.code] },
      );
    }
    return NextResponse.json(
      { data: result.data },
      { headers: { "Cache-Control": cacheControl } },
    );
  };
}
