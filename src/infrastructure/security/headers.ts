import type { NextResponse } from "next/server";

interface ContentSecurityPolicyOptions {
  nonce: string;
  connectSrc?: string[];
  development?: boolean;
  upgradeInsecureRequests?: boolean;
}

export function buildContentSecurityPolicy({
  connectSrc = [],
  development = false,
  nonce,
  upgradeInsecureRequests = false,
}: ContentSecurityPolicyOptions): string {
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": [
      "'self'",
      `'nonce-${nonce}'`,
      "'strict-dynamic'",
      ...(development ? ["'unsafe-eval'"] : []),
    ],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:", "https:"],
    "font-src": ["'self'", "data:"],
    "connect-src": [
      "'self'",
      "https://api.iconify.design",
      "https://api.simplesvg.com",
      "https://api.unisvg.com",
      "https://image.tmdb.org",
      ...connectSrc,
    ],
    "frame-src": [
      "https://www.youtube-nocookie.com",
      "https://www.youtube.com",
    ],
    "media-src": ["'self'", "blob:"],
    "worker-src": ["'self'", "blob:"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
  };

  const parts = Object.entries(directives).map(
    ([key, values]) => `${key} ${values.join(" ")}`,
  );
  if (upgradeInsecureRequests) parts.push("upgrade-insecure-requests");
  return parts.join("; ");
}

export function createNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes));
}

export function applySecurityHeaders(
  response: NextResponse,
  csp: string,
): NextResponse {
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()",
  );
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=63072000; includeSubDomains; preload",
  );
  response.headers.set("Content-Security-Policy", csp);
  return response;
}
