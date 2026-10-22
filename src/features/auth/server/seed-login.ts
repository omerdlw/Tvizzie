import "server-only";
import { UserError } from "@omerdlw/base-framework/utils";
import {
  createAdminSupabaseClient,
  createServerSupabaseClient,
} from "@/infrastructure/supabase/server";
import { SEED_EMAIL_DOMAIN } from "../lib/constants";

const NOT_A_SEED_ACCOUNT = "This is not a test account";

// Accounts made by scripts/seed live on a reserved TLD, so no sign-in code can
// ever reach them. On a server started with SEED_LOGIN=1 (never on Vercel
// production) they sign in straight from the email step; anywhere else the
// route answers 404.
export function isSeedLoginEnabled(): boolean {
  return (
    process.env.SEED_LOGIN === "1" && process.env.VERCEL_ENV !== "production"
  );
}

export async function signInSeedAccount(value: unknown): Promise<string> {
  const email = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (email.length > 254 || !email.endsWith(`@${SEED_EMAIL_DOMAIN}`)) {
    throw new UserError(NOT_A_SEED_ACCOUNT, 403);
  }

  // Look the account up before minting a link: a magic link for an unknown
  // address would sign a new user up.
  const admin = createAdminSupabaseClient();
  const { data: owner, error: ownerError } = await admin
    .from("account_emails")
    .select("account_id")
    .eq("email", email)
    .maybeSingle();
  if (ownerError) throw ownerError;
  if (!owner) throw new UserError(NOT_A_SEED_ACCOUNT, 403);

  const { data: found, error: userError } = await admin.auth.admin.getUserById(
    owner.account_id,
  );
  if (userError) throw userError;
  if (found.user?.app_metadata?.seed !== true) {
    throw new UserError(NOT_A_SEED_ACCOUNT, 403);
  }

  const { data: link, error: linkError } = await admin.auth.admin.generateLink({
    email,
    type: "magiclink",
  });
  if (linkError) throw linkError;

  // Redeem the link's one-time token on the cookie-backed client, which is
  // what an email link would have done in the browser.
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.verifyOtp({
    token_hash: link.properties.hashed_token,
    type: "email",
  });
  if (error?.status === 429) {
    throw new UserError("Too many sign-ins, wait a few minutes", 429);
  }
  if (error) throw error;

  return found.user.id;
}
