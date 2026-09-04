import 'server-only';

import { createClient } from '@supabase/supabase-js';
import { normalizeEmailValue, normalizeValue } from '@/shared';
import { createAdminClient } from '@/infrastructure/supabase/server';
import {
  assertSupabasePublicEnv,
  SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_URL,
} from '@/infrastructure/supabase/server';
import { createAdminAuthFacade, extractUuid } from './admin.js';

export function createEphemeralClient() {
  assertSupabasePublicEnv();
  return createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}

export async function createAuthenticatedEphemeralClient({ accessToken, refreshToken }) {
  const client = createEphemeralClient();
  const result = await client.auth.setSession({
    access_token: normalizeValue(accessToken),
    refresh_token: normalizeValue(refreshToken),
  });

  if (result.error || !result.data?.session?.access_token) {
    throw new Error(
      result.error?.message || 'Temporary authentication session could not be established',
    );
  }

  return { client, session: result.data.session };
}

export async function mintPasswordlessSession({ email, userId = null }) {
  const normalizedEmail = normalizeEmailValue(email);
  if (!normalizedEmail) throw new Error('A verified email is required');

  const admin = createAdminClient();
  let userRecord;
  try {
    userRecord = await createAdminAuthFacade().getUserByEmail(normalizedEmail);
  } catch {
    throw new Error('Authenticated user could not be loaded');
  }

  const resolvedUserId = extractUuid(userRecord?.uid || userRecord?.id);
  const expectedUserId = extractUuid(userId);
  if (expectedUserId && resolvedUserId !== expectedUserId) {
    throw new Error('Verified email does not match the authenticated user');
  }

  const linkResult = await admin.auth.admin.generateLink({
    email: normalizedEmail,
    type: 'magiclink',
  });
  if (linkResult.error) {
    throw new Error(linkResult.error.message || 'Passwordless session could not be prepared');
  }

  const properties = linkResult.data?.properties || {};
  const tokenHash = normalizeValue(properties.hashed_token);
  const verificationType = normalizeValue(properties.verification_type) || 'magiclink';
  if (!tokenHash) {
    throw new Error('Passwordless session token was not returned by Supabase');
  }

  const verificationResult = await createEphemeralClient().auth.verifyOtp({
    token_hash: tokenHash,
    type: verificationType,
  });
  if (verificationResult.error || !verificationResult.data?.session) {
    throw new Error(
      verificationResult.error?.message || 'Passwordless session could not be established',
    );
  }

  const session = verificationResult.data.session;
  return {
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    user: verificationResult.data.user ||
      session.user || { id: resolvedUserId, email: normalizedEmail },
    userId: resolvedUserId,
  };
}
