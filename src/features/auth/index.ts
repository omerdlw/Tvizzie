"use client";

export type * from "./lib/types";

export {
  deletePasskey,
  getUserIdentities,
  linkIdentity,
  listPasskeys,
  registerPasskey,
  renamePasskey,
  requestEmailAuth,
  signInWithOAuth,
  signInWithPasskey,
  unlinkIdentity,
  verifyEmailOtp,
} from "./lib/client";

export { AUTH_EVENTS, OAUTH_PROVIDERS } from "./lib/constants";

export { getAuthCallbackUrl, sanitizeNextPath } from "./lib/utils";
export { getAuthErrorMessage } from "./lib/messages";

export { AuthProvider, useAuth } from "./lib/provider";

export {
  createSignInSurfaceEntry,
  AUTH_INPUT_CLASS,
} from "./components/sign-in-surface";
export { createVerificationSurfaceEntry } from "./components/verification-surface";
export { AuthListener } from "./components/auth-listener";
