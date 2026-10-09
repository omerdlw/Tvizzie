export type TmdbError =
  | { kind: "misconfigured"; message: string }
  | { kind: "invalid_request"; message: string }
  | { kind: "not_found"; message: string }
  | { kind: "unauthorized"; message: string; status: number }
  | {
      kind: "rate_limited";
      message: string;
      retryAfterMs: number | null;
    }
  | { kind: "upstream"; message: string; status: number }
  | { kind: "timeout"; message: string }
  | { kind: "network"; message: string }
  | { kind: "invalid_response"; message: string; issues: string[] };

type TmdbErrorKind = TmdbError["kind"];

const EXPECTED_KINDS: ReadonlySet<TmdbErrorKind> = new Set([
  "invalid_request",
  "not_found",
]);

export function isExpectedTmdbError(error: TmdbError): boolean {
  return EXPECTED_KINDS.has(error.kind);
}

export const tmdbErrors = {
  misconfigured: (message: string): TmdbError => ({
    kind: "misconfigured",
    message,
  }),
  invalidRequest: (message: string): TmdbError => ({
    kind: "invalid_request",
    message,
  }),
  notFound: (message = "The requested resource was not found"): TmdbError => ({
    kind: "not_found",
    message,
  }),
  unauthorized: (status: number): TmdbError => ({
    kind: "unauthorized",
    message: "TMDB rejected the access token",
    status,
  }),
  rateLimited: (retryAfterMs: number | null): TmdbError => ({
    kind: "rate_limited",
    message: "TMDB rate limit exceeded",
    retryAfterMs,
  }),
  upstream: (status: number): TmdbError => ({
    kind: "upstream",
    message: `TMDB responded with status ${status}`,
    status,
  }),
  timeout: (timeoutMs: number): TmdbError => ({
    kind: "timeout",
    message: `TMDB did not respond within ${timeoutMs}ms`,
  }),
  network: (message: string): TmdbError => ({ kind: "network", message }),
  invalidResponse: (path: string, issues: string[]): TmdbError => ({
    kind: "invalid_response",
    message: `TMDB returned an unexpected payload for ${path}`,
    issues,
  }),
} as const;
