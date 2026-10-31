import { err, ok, type Result } from "@omerdlw/base-framework/result";
import type { z } from "zod";
import {
  TMDB_API_BASE_URL,
  TMDB_CACHE_TAG,
  TMDB_RETRY,
  TMDB_TIMEOUT_MS,
} from "./constants";
import { isExpectedTmdbError, tmdbErrors, type TmdbError } from "./errors";

export interface TmdbConfig {
  accessToken: string;
  baseUrl?: string;
}

type TmdbQuery = Record<string, string | number | boolean | null | undefined>;

export interface TmdbRequest<T> {
  path: string;
  query?: TmdbQuery;
  schema: z.ZodType<T, unknown>;
  revalidate?: number;
  tags?: readonly string[];
  signal?: AbortSignal;
}

export interface TmdbTransportOptions {
  config: () => TmdbConfig | null;
  onError?: (error: TmdbError, path: string) => void;
}

export interface TmdbTransport {
  request<T>(request: TmdbRequest<T>): Promise<Result<T, TmdbError>>;
}

export type NextFetchInit = RequestInit & {
  next?: { revalidate?: number | false; tags?: string[] };
};

const RETRYABLE_STATUSES: ReadonlySet<number> = new Set([
  429, 500, 502, 503, 504,
]);

interface Attempt<T> {
  result: Result<T, TmdbError>;
  retryable: boolean;
  retryAfterMs: number | null;
}

function buildTmdbUrl(
  baseUrl: string,
  path: string,
  query: TmdbQuery = {},
): URL {
  const url = new URL(
    `${baseUrl.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`,
  );
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    url.searchParams.set(key, String(value));
  }
  return url;
}

function parseRetryAfter(
  header: string | null,
  now: number = Date.now(),
): number | null {
  if (!header) return null;
  const seconds = Number(header);
  if (Number.isFinite(seconds)) return Math.max(0, Math.round(seconds * 1000));
  const date = Date.parse(header);
  return Number.isNaN(date) ? null : Math.max(0, date - now);
}

function describeIssues(error: z.ZodError): string[] {
  return error.issues
    .slice(0, 10)
    .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`);
}

const sleep = (ms: number) => new Promise((done) => setTimeout(done, ms));

function backoff(attempt: number): number {
  const ceiling = Math.min(
    TMDB_RETRY.maxDelayMs,
    TMDB_RETRY.baseDelayMs * 2 ** attempt,
  );
  return Math.round(Math.random() * ceiling);
}

export function createTmdbTransport(
  options: TmdbTransportOptions,
): TmdbTransport {
  async function attemptOnce<T>(
    request: TmdbRequest<T>,
    config: TmdbConfig,
  ): Promise<Attempt<T>> {
    const fail = (
      error: TmdbError,
      retryable = false,
      retryAfterMs: number | null = null,
    ): Attempt<T> => ({ result: err(error), retryable, retryAfterMs });

    const timeoutSignal = AbortSignal.timeout(TMDB_TIMEOUT_MS);
    const signal = request.signal
      ? AbortSignal.any([request.signal, timeoutSignal])
      : timeoutSignal;
    const url = buildTmdbUrl(
      config.baseUrl ?? TMDB_API_BASE_URL,
      request.path,
      request.query,
    );

    let response: Response;
    try {
      const init: NextFetchInit = {
        method: "GET",
        headers: {
          accept: "application/json",
          authorization: `Bearer ${config.accessToken}`,
        },
        signal,
        next: {
          revalidate: request.revalidate,
          tags: [TMDB_CACHE_TAG, ...(request.tags ?? [])],
        },
      };
      response = await fetch(url, init);
    } catch (cause) {
      if (timeoutSignal.aborted) {
        return fail(tmdbErrors.timeout(TMDB_TIMEOUT_MS), true);
      }
      if (request.signal?.aborted) {
        return fail(tmdbErrors.network("The request was aborted"));
      }
      return fail(
        tmdbErrors.network(
          cause instanceof Error ? cause.message : "Network request failed",
        ),
        true,
      );
    }

    const { status } = response;
    if (status === 401 || status === 403) {
      return fail(tmdbErrors.unauthorized(status));
    }
    if (status === 404) return fail(tmdbErrors.notFound());
    if (status === 400 || status === 422) {
      return fail(tmdbErrors.invalidRequest(`TMDB rejected ${request.path}`));
    }
    if (status === 429) {
      const retryAfterMs = parseRetryAfter(response.headers.get("retry-after"));
      return fail(tmdbErrors.rateLimited(retryAfterMs), true, retryAfterMs);
    }
    if (!response.ok) {
      return fail(tmdbErrors.upstream(status), RETRYABLE_STATUSES.has(status));
    }

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      return fail(
        tmdbErrors.invalidResponse(request.path, ["body is not valid JSON"]),
      );
    }

    const parsed = request.schema.safeParse(body);
    if (!parsed.success) {
      return fail(
        tmdbErrors.invalidResponse(request.path, describeIssues(parsed.error)),
      );
    }
    return { result: ok(parsed.data), retryable: false, retryAfterMs: null };
  }

  return {
    async request<T>(request: TmdbRequest<T>): Promise<Result<T, TmdbError>> {
      const config = options.config();
      if (!config?.accessToken) {
        const error = tmdbErrors.misconfigured(
          "TMDB_READ_ACCESS_TOKEN is not set",
        );
        options.onError?.(error, request.path);
        return err(error);
      }

      for (let attempt = 0; ; attempt++) {
        const outcome = await attemptOnce(request, config);
        const { result } = outcome;
        if (result.success) return result;

        const exhausted = attempt >= TMDB_RETRY.maxRetries;
        const tooLong =
          outcome.retryAfterMs !== null &&
          outcome.retryAfterMs > TMDB_RETRY.maxRetryAfterMs;

        if (!outcome.retryable || exhausted || tooLong) {
          if (!isExpectedTmdbError(result.error)) {
            options.onError?.(result.error, request.path);
          }
          return result;
        }
        await sleep(outcome.retryAfterMs ?? backoff(attempt));
      }
    },
  };
}
