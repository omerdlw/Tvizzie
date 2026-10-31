import "server-only";

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { report } from "@omerdlw/base-framework/utils";
import { getSupabasePublicConfig } from "@/infrastructure/env";
import { getClientIp } from "@/infrastructure/security/rate-limiter";
import {
  applySecurityHeaders,
  buildContentSecurityPolicy,
  createNonce,
} from "@/infrastructure/security/headers";
import type { Database } from "./database.types";
import { SESSION_CHECKED_HEADER, isHttpsRequest } from "./session";

const SESSION_CHECK_TTL_MS = 30_000;
const SESSION_CHECK_LIMIT = 5_000;
const sessionChecks = new Map<
  string,
  { expires: number; live: Promise<boolean> }
>();

function checkSession(
  supabase: SupabaseClient<Database>,
  sessionId: string,
  request: NextRequest,
): Promise<boolean> {
  const now = Date.now();
  const known = sessionChecks.get(sessionId);
  if (known && known.expires > now) return known.live;

  const live = (async () => {
    const { data, error } = await supabase.rpc("check_auth_session", {
      p_ip_address: getClientIp(request),
      p_session_id: sessionId,
      p_user_agent: request.headers.get("user-agent"),
    });
    if (error) throw error;
    return data !== false;
  })();

  sessionChecks.delete(sessionId);
  sessionChecks.set(sessionId, { expires: now + SESSION_CHECK_TTL_MS, live });
  live.then(
    (isLive) => {
      if (!isLive) sessionChecks.delete(sessionId);
    },
    () => sessionChecks.delete(sessionId),
  );

  for (const [key, entry] of sessionChecks) {
    if (sessionChecks.size <= SESSION_CHECK_LIMIT && entry.expires > now) {
      break;
    }
    sessionChecks.delete(key);
  }

  return live;
}

export async function updateSupabaseSession(
  request: NextRequest,
): Promise<NextResponse> {
  const config = getSupabasePublicConfig();
  const https = isHttpsRequest(request.headers, request.nextUrl.protocol);
  const nonce = createNonce();
  const csp = buildContentSecurityPolicy({
    connectSrc: config ? [config.url, config.url.replace(/^http/, "ws")] : [],
    development: process.env.NODE_ENV === "development",
    nonce,
    upgradeInsecureRequests: https,
  });

  request.headers.set("content-security-policy", csp);
  request.headers.set("x-nonce", nonce);
  request.headers.delete(SESSION_CHECKED_HEADER);

  const cookieWrites = new Map<
    string,
    { name: string; options: CookieOptions; value: string }
  >();
  const cacheHeaders: Record<string, string> = {};

  const respond = (response = NextResponse.next({ request })) => {
    cookieWrites.forEach(({ name, options, value }) => {
      response.cookies.set(name, value, options);
    });
    Object.entries(cacheHeaders).forEach(([key, value]) =>
      response.headers.set(key, value),
    );
    return applySecurityHeaders(response, csp);
  };

  if (!config) return respond();

  const supabase = createServerClient<Database>(
    config.url,
    config.publishableKey,
    {
      auth: {
        experimental: { passkey: true },
        flowType: "pkce",
      },
      cookieOptions: { secure: https },
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet, headers = {}) {
          cookiesToSet.forEach(({ name, options, value }) => {
            request.cookies.set(name, value);
            cookieWrites.set(name, { name, options, value });
          });
          Object.assign(cacheHeaders, headers);
        },
      },
    },
  );

  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims || null;
  const sessionId = String(claims?.session_id || "").trim();

  if (!claims?.sub || !sessionId) return respond();

  let live: boolean;
  try {
    live = await checkSession(supabase, sessionId, request);
  } catch (error) {
    report("Supabase session check", error);
    return respond(
      new NextResponse("Session validation unavailable", { status: 503 }),
    );
  }

  if (!live) {
    await supabase.auth.signOut({ scope: "local" });
    const signInUrl = request.nextUrl.clone();
    signInUrl.pathname = "/";
    signInUrl.search = "?reason=session-revoked";
    return respond(NextResponse.redirect(signInUrl));
  }

  request.headers.set(SESSION_CHECKED_HEADER, sessionId);
  return respond();
}
