import { err, ok, type Result } from "@omerdlw/base-framework/result";
import { SEARCH_ENDPOINTS } from "./constants";
import type {
  SearchFailure,
  SearchFailureCode,
  SearchResponseMap,
  SearchType,
} from "./types";

const FALLBACK_MESSAGE =
  "Search is unavailable right now. Please try again in a moment";

const failure = (
  code: SearchFailureCode,
  message = FALLBACK_MESSAGE,
): Result<never, SearchFailure> => err({ code, message });

function isSearchResponse(
  value: unknown,
): value is SearchResponseMap[SearchType] {
  return (
    typeof value === "object" &&
    value !== null &&
    Array.isArray((value as { hits?: unknown }).hits)
  );
}

export async function fetchSearch<T extends SearchType>(
  type: T,
  query: string,
  signal?: AbortSignal,
): Promise<Result<SearchResponseMap[T], SearchFailure>> {
  let response: Response;
  try {
    response = await fetch(
      `${SEARCH_ENDPOINTS[type]}?${new URLSearchParams({ q: query })}`,
      {
        headers: { accept: "application/json" },
        signal,
      },
    );
  } catch {
    return signal?.aborted ? failure("aborted") : failure("unavailable");
  }

  const body: unknown = await response.json().catch(() => null);
  const payload = body as {
    code?: SearchFailureCode;
    data?: unknown;
    error?: string;
  } | null;

  if (response.ok && isSearchResponse(payload?.data)) {
    // An answer cached before a hit carried its weights (the browser may
    // serve one while it revalidates) still sorts: missing weights are 0.
    const data = payload.data as SearchResponseMap[T];
    const hits = (data.hits as unknown[]).map((hit) => {
      const { match, score } = hit as { match?: unknown; score?: unknown };
      return {
        ...(hit as object),
        match: typeof match === "number" ? match : 0,
        score: typeof score === "number" ? score : 0,
      };
    });
    return ok({ ...data, hits } as SearchResponseMap[T]);
  }

  const code: SearchFailureCode =
    response.status === 400
      ? "invalid_query"
      : response.status === 429
        ? "rate_limited"
        : "unavailable";
  return failure(code, payload?.error);
}
