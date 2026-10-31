export {
  deletePasskey,
  getUserIdentities,
  linkIdentity,
  listPasskeys,
  registerPasskey,
  renamePasskey,
  requestEmailAuth,
  unlinkIdentity,
} from "./lib/client";
export { OAUTH_PROVIDERS } from "./lib/constants";
export { getAuthErrorMessage } from "./lib/messages";
export { AuthProvider, useAuth } from "./lib/provider";
export type { OAuthProvider } from "./lib/types";
export { getAuthCallbackUrl } from "./lib/utils";
export { AuthListener } from "./components/auth-listener";
export {
  AUTH_INPUT_CLASS,
  createSignInSurfaceEntry,
} from "./components/sign-in-surface";
export { createVerificationSurfaceEntry } from "./components/verification-surface";
