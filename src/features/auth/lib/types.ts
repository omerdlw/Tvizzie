import type { Session, SupabaseClient, User } from "@supabase/supabase-js";
import type { Database } from "@/infrastructure/supabase/client";

export type AuthClient = SupabaseClient<Database>;

export type OAuthProvider = "google" | "github" | "x";

export type SignOutScope = "local" | "global" | "others";

export interface AuthUser {
  aal: string;
  claims: Record<string, unknown>;
  email: string | null;
  id: string;
  sessionId: string | null;
}

export interface AuthState {
  error: unknown;
  isAuthenticated: boolean;
  isConfigured: boolean;
  isReady: boolean;
  session: Session | null;
  user: User | null;
}

export interface AuthContextValue extends AuthState {
  client: AuthClient | null;
  refresh: () => Promise<AuthState | null>;
  signOut: (scope?: SignOutScope) => Promise<void>;
}
