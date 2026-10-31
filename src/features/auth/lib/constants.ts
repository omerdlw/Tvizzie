import type { AuthState, OAuthProvider } from "./types";

export const AUTH_CALLBACK_PATH = "/auth/callback";

export const OAUTH_PROVIDERS: readonly OAuthProvider[] = Object.freeze([
  "google",
  "github",
  "x",
]);

export const MAX_AUTH_AGE_SECONDS = 600;

export const SEED_EMAIL_DOMAIN = "seed.tvizzie.test";

export const INITIAL_AUTH_STATE: AuthState = Object.freeze({
  error: null,
  isAuthenticated: false,
  isConfigured: false,
  isReady: false,
  session: null,
  user: null,
});
