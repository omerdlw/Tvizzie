import 'server-only';
import { normalizeEmailValue, normalizeValue } from '@/shared/utils';
import { createAdminClient } from '@/infrastructure/supabase/admin';
import {
  SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_URL,
} from '@/infrastructure/supabase/supabase-constants';
import { resolveProviderDescriptors } from '@/domains/auth/utils';

const SESSION_CONTROL_FUNCTION = 'session-control';
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function assertUserId(userId) {
  const normalizedUserId = normalizeValue(userId);
  if (!normalizedUserId || !UUID_REGEX.test(normalizedUserId)) {
    throw new Error('Valid User ID UUID is required');
  }
  return normalizedUserId;
}

function normalizeIdentities(value) {
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function toUserRecord(user = null) {
  if (!user?.id) return null;
  const identities = normalizeIdentities(user.identities);

  return {
    app_metadata: user.app_metadata || {},
    disabled: user.banned_until != null,
    email: normalizeEmailValue(user.email) || null,
    emailVerified: user.email_confirmed_at != null || user.confirmed_at != null,
    identityCount: identities.length,
    metadata: {
      creationTime: user.created_at || null,
      lastSignInTime: user.last_sign_in_at || null,
    },
    providerData: resolveProviderDescriptors({
      identities,
      email: user.email,
      userId: user.id,
    }).map((provider) => ({ email: provider.email, providerId: provider.id, uid: provider.uid })),
    uid: user.id,
    user_metadata: user.user_metadata || {},
  };
}

export async function invokeSessionControl({ currentSessionJti = null, reason = null, userId }) {
  const normalizedUserId = assertUserId(userId);
  const internalToken = normalizeValue(process.env.INFRA_INTERNAL_TOKEN);
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !internalToken) {
    throw new Error('Supabase session control is not configured');
  }

  const response = await fetch(`${SUPABASE_URL}/functions/v1/${SESSION_CONTROL_FUNCTION}`, {
    method: 'POST',
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'x-infra-internal-token': internalToken,
    },
    body: JSON.stringify({
      currentSessionJti: normalizeValue(currentSessionJti) || null,
      reason: normalizeValue(reason) || null,
      userId: normalizedUserId,
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || normalizeValue(payload?.ok).toLowerCase() === 'false') {
    throw new Error(normalizeValue(payload?.error) || 'Session control request failed');
  }

  return payload;
}

export async function getUserByEmail(email) {
  const normalizedEmail = normalizeEmailValue(email);
  if (!normalizedEmail) throw new Error('Email is required');
  const result = await createAdminClient()
    .rpc('auth_get_user_by_email', { p_email: normalizedEmail })
    .maybeSingle();
  if (result.error) throw new Error(result.error.message || 'User lookup failed');
  if (!result.data) {
    const error = new Error('User not found');
    error.code = 'auth/user-not-found';
    throw error;
  }
  return toUserRecord(result.data);
}

export async function getUserById(userId) {
  const result = await createAdminClient().auth.admin.getUserById(assertUserId(userId));
  if (result.error) throw new Error(result.error.message || 'User could not be loaded');
  return toUserRecord(result.data?.user || null);
}

export async function createUser(payload = {}) {
  const result = await createAdminClient().auth.admin.createUser({
    app_metadata: payload.appMetadata || {},
    email: normalizeEmailValue(payload.email),
    email_confirm: Boolean(payload.emailVerified),
    password: payload.password !== undefined ? String(payload.password || '') : undefined,
    user_metadata: payload.userMetadata || {},
  });
  if (result.error) throw new Error(result.error.message || 'User could not be created');
  return toUserRecord(result.data?.user || null);
}

export async function updateUser(userId, payload = {}) {
  const updatePayload = {};
  if (payload.email !== undefined) updatePayload.email = normalizeEmailValue(payload.email);
  if (payload.emailVerified !== undefined)
    updatePayload.email_confirm = Boolean(payload.emailVerified);
  if (payload.password !== undefined) updatePayload.password = String(payload.password || '');
  if (payload.appMetadata !== undefined) updatePayload.app_metadata = payload.appMetadata || {};
  if (payload.userMetadata !== undefined) updatePayload.user_metadata = payload.userMetadata || {};

  const result = await createAdminClient().auth.admin.updateUserById(
    assertUserId(userId),
    updatePayload,
  );
  if (result.error) throw new Error(result.error.message || 'User could not be updated');
  return toUserRecord(result.data?.user || null);
}

export async function deleteUser(userId) {
  const result = await createAdminClient().auth.admin.deleteUser(assertUserId(userId));
  if (result.error) throw new Error(result.error.message || 'User could not be deleted');
  return true;
}

export async function revokeRefreshTokens(userId, options = {}) {
  await invokeSessionControl({
    currentSessionJti: options.currentSessionJti,
    reason: options.reason || 'credential-change',
    userId,
  });
  return true;
}

export function createAdminAuthFacade(options = {}) {
  return {
    createUser,
    deleteUser,
    getUser: getUserById,
    getUserByEmail,
    revokeRefreshTokens(userId, overrides = {}) {
      return revokeRefreshTokens(userId, {
        currentSessionJti: overrides.currentSessionJti || options.currentSessionJti,
        reason: overrides.reason || options.reason,
      });
    },
    updateUser,
  };
}
