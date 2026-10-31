import {
  getSiteUrl,
  trimToNull,
  UserError,
} from "@omerdlw/base-framework/utils";
import { AUTH_CALLBACK_PATH } from "./constants";
import type { Session } from "@supabase/supabase-js";
import type { AuthState, AuthUser } from "./types";

export function normalizeEmail(value: unknown): string {
  const email = String(value || "")
    .trim()
    .toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new UserError("Enter a valid email address");
  }
  return email;
}

export function sanitizeNextPath(
  value: unknown,
  fallback = "/account",
): string {
  const path = trimToNull(value);
  if (!path || !/^\/(?!\/)[^\\\u0000-\u001f]*$/.test(path)) return fallback;
  return path;
}

export function getAuthCallbackUrl(nextPath = "/account"): string {
  const origin =
    typeof window !== "undefined" ? window.location.origin : getSiteUrl();
  const callback = new URL(AUTH_CALLBACK_PATH, origin);
  callback.searchParams.set("next", sanitizeNextPath(nextPath));
  return callback.toString();
}

export function toAuthUser(
  claims: Record<string, unknown> | null | undefined,
): AuthUser | null {
  if (typeof claims?.sub !== "string") return null;
  return {
    aal: typeof claims.aal === "string" ? claims.aal : "aal1",
    claims,
    email: typeof claims.email === "string" ? claims.email : null,
    id: claims.sub,
    sessionId: typeof claims.session_id === "string" ? claims.session_id : null,
  };
}

export function authStateFrom(session: Session | null): AuthState {
  return {
    error: null,
    isAuthenticated: Boolean(session?.user),
    isConfigured: true,
    isReady: true,
    session,
    user: session?.user ?? null,
  };
}
