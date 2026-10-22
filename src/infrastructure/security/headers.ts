import type { NextResponse } from "next/server";

interface ContentSecurityPolicyOptions {
  // Scripts run only when they carry this request's nonce, or were added by
  // one that did ('strict-dynamic'): Next.js stamps its own scripts with it.
  nonce: string;
  // Origins the browser talks to directly, beyond this one (Supabase).
  connectSrc?: string[];
  development?: boolean;
  // Only over https: on plain http it would point every asset at an https
  // address that is not there.
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
    // React rebuilds server error stacks with eval in development only.
    "script-src": [
      "'self'",
      `'nonce-${nonce}'`,
      "'strict-dynamic'",
      ...(development ? ["'unsafe-eval'"] : []),
    ],
    // Server-rendered style attributes cannot carry a nonce, and the motion
    // layer writes inline styles on every frame.
    "style-src": ["'self'", "'unsafe-inline'"],
    // Posters, backdrops and profile pictures come from TMDB, YouTube and any
    // https address a profile was given.
    "img-src": ["'self'", "data:", "blob:", "https:"],
    "font-src": ["'self'", "data:"],
    // Icons load on demand from Iconify's API and its two fallback hosts. The
    // ambient light reads a page's picture straight from TMDB, and through
    // /api/ambient/proxy only when that fails.
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

interface SecurityHeaderOptions {
  csp?: string;
  hsts?: boolean;
  frameOptions?: "DENY" | "SAMEORIGIN";
  permissionsPolicy?: string;
}

export function applySecurityHeaders(
  response: NextResponse,
  options: SecurityHeaderOptions = {},
): NextResponse {
  if (!response?.headers) return response;

  const {
    csp,
    hsts = true,
    frameOptions = "DENY",
    permissionsPolicy = "camera=(), microphone=(), geolocation=()",
  } = options;

  response.headers.set("X-Frame-Options", frameOptions);
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", permissionsPolicy);

  if (hsts) {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload",
    );
  }

  if (csp) response.headers.set("Content-Security-Policy", csp);

  return response;
}
