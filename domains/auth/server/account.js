import { normalizeEmailValue, normalizeValue } from '@/shared';
import { createAdminClient } from '@/infrastructure/supabase/server';
import { validateUsername } from '@/domains/account/utils/validation';
import { ACCOUNT_LIFECYCLE_TABLE } from '@/domains/auth/utils/constants';

export const ACCOUNT_LIFECYCLE_STATES = Object.freeze({
  ACTIVE: 'ACTIVE',
  DELETED: 'DELETED',
  PENDING_CHANGE: 'PENDING_CHANGE',
  PENDING_DELETE: 'PENDING_DELETE',
});

export const EMAIL_ACCOUNT_STATES = Object.freeze({
  AVAILABLE: 'available',
  EXISTING_GOOGLE_ONLY: 'existing_google_only',
  EXISTING_EMAIL_ACCOUNT: 'existing_email_account',
});

export async function claimUsernameForProfile({
  avatarUrl = null,
  displayName,
  email = null,
  failIfProfileHasUsername = false,
  preserveExisting = false,
  userId,
  username,
}) {
  const admin = createAdminClient();
  const { error } = await admin.rpc('claim_username', {
    p_avatar_url: normalizeValue(avatarUrl) || null,
    p_display_name: normalizeValue(displayName) || username,
    p_email: normalizeEmailValue(email) || null,
    p_fail_if_profile_has_username: Boolean(failIfProfileHasUsername),
    p_preserve_existing: Boolean(preserveExisting),
    p_user_id: normalizeValue(userId),
    p_username: validateUsername(username),
  });

  if (error) {
    throw new Error(error.message || 'Username could not be claimed');
  }
}

export async function updateAccountProfileRecord({ patch, userId }) {
  const normalizedUserId = normalizeValue(userId);
  if (!normalizedUserId) throw new Error('Authenticated user is required');
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
    throw new Error('Account profile changes are required');
  }

  const admin = createAdminClient();
  const { error } = await admin.rpc('update_account_profile_atomic', {
    p_patch: patch,
    p_user_id: normalizedUserId,
  });

  if (error) {
    throw new Error(error.message || 'Account profile could not be updated');
  }
}

function isUsernameTakenError(error) {
  return normalizeValue(error?.message).toUpperCase().includes('USERNAME_TAKEN');
}

function createUsernameBase({ displayName, email, userId }) {
  const preferredValue = normalizeValue(displayName) || normalizeValue(email).split('@')[0];
  const fallbackValue = `user_${normalizeValue(userId).replace(/-/g, '').slice(0, 8)}`;

  try {
    return validateUsername(preferredValue).slice(0, 18);
  } catch {
    return validateUsername(fallbackValue).slice(0, 18);
  }
}

function createUsernameCandidate(baseUsername, userId, attempt) {
  if (attempt === 0) return baseUsername;

  const uniqueSuffix = `${normalizeValue(userId).replace(/-/g, '').slice(0, 6)}${attempt}`;
  const candidateBase = baseUsername.slice(0, Math.max(3, 24 - uniqueSuffix.length - 1));
  return validateUsername(`${candidateBase}_${uniqueSuffix}`);
}

async function claimAvailableUsernameForProfile({
  avatarUrl,
  displayName,
  email,
  userId,
  username,
}) {
  const baseUsername = username
    ? validateUsername(username)
    : createUsernameBase({ displayName, email, userId });
  const maxAttempts = username ? 1 : 3;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const candidate = createUsernameCandidate(baseUsername, userId, attempt);

    try {
      await claimUsernameForProfile({
        avatarUrl,
        displayName,
        email,
        preserveExisting: false,
        userId,
        username: candidate,
      });
      return candidate;
    } catch (error) {
      if (!isUsernameTakenError(error) || attempt === maxAttempts - 1) throw error;
    }
  }

  throw new Error('Username could not be claimed');
}

export async function ensureAccountProfileRecord({
  avatarUrl = null,
  displayName,
  email,
  userId,
  username,
}) {
  const normalizedUserId = normalizeValue(userId);
  const normalizedEmail = normalizeEmailValue(email);

  if (!normalizedUserId || !normalizedEmail) {
    throw new Error('User ID and email are required to create the account profile');
  }

  const admin = createAdminClient();
  const existingProfileRes = await admin
    .from('profiles')
    .select('id, email, username, display_name')
    .eq('id', normalizedUserId)
    .maybeSingle();

  const existingProfile = existingProfileRes.data || null;

  if (existingProfile?.id && normalizeValue(existingProfile?.username)) {
    await ensureAccountLifecycle(normalizedUserId);
    return existingProfile;
  }

  const resolvedDisplayName = normalizeValue(displayName) || normalizedEmail.split('@')[0];
  await claimAvailableUsernameForProfile({
    avatarUrl,
    displayName: resolvedDisplayName,
    email: normalizedEmail,
    userId: normalizedUserId,
    username,
  });

  const profileResult = await admin
    .from('profiles')
    .select('id, email, username')
    .eq('id', normalizedUserId)
    .maybeSingle();

  if (profileResult.error) {
    throw new Error(profileResult.error.message || 'Profile could not be loaded');
  }

  const profile = profileResult.data || null;

  if (!profile?.id || !normalizeValue(profile?.username)) {
    throw new Error('Profile could not be bootstrapped');
  }

  await ensureAccountLifecycle(normalizedUserId);

  return profile;
}

import { extractUuid } from './admin.js';

export async function purgeAccountData(userIdInput) {
  const normalizedUserId = extractUuid(userIdInput);
  if (!normalizedUserId) throw new Error('Authenticated user is required');

  const admin = createAdminClient();

  const atomicCleanup = await admin.rpc('delete_account_data', {
    p_user_id: normalizedUserId,
  });

  if (!atomicCleanup.error) return;

  const cleanupError = normalizeValue(atomicCleanup.error.message).toLowerCase();
  const functionUnavailable =
    cleanupError.includes('delete_account_data') &&
    (cleanupError.includes('does not exist') || cleanupError.includes('schema cache'));

  if (!functionUnavailable) {
    throw new Error(atomicCleanup.error.message || 'Account data could not be deleted');
  }

  const executeDelete = async (query, fallbackMessage) => {
    const res = await query;
    if (res?.error) throw new Error(res.error.message || fallbackMessage);
  };

  const tablesToClearByUser = [
    'usernames',
    'profile_counters',
    'likes',
    'watchlist',
    'watched',
    'activity',
    'list_items',
    'list_reviews',
    'media_reviews',
    'review_likes',
    'list_likes',
    'lists',
    'auth_challenges',
    'auth_audit_logs',
    'auth_revocation_state',
    'feedback_submissions',
  ];

  for (const table of tablesToClearByUser) {
    try {
      await admin.from(table).delete().eq('user_id', normalizedUserId);
    } catch {}
  }

  await executeDelete(
    admin
      .from('follows')
      .delete()
      .or(`follower_id.eq.${normalizedUserId},following_id.eq.${normalizedUserId}`),
    'Follow relations could not be deleted',
  );

  await executeDelete(
    admin
      .from('notifications')
      .delete()
      .or(`user_id.eq.${normalizedUserId},actor_user_id.eq.${normalizedUserId}`),
    'Notifications could not be deleted',
  );

  await executeDelete(
    admin.from('profiles').delete().eq('id', normalizedUserId),
    'Profile could not be deleted',
  );

  try {
    await admin.from('account_lifecycle').delete().eq('user_id', normalizedUserId);
  } catch {}
}

function normalizeState(value) {
  const normalized = normalizeValue(value).toUpperCase();
  return normalized || ACCOUNT_LIFECYCLE_STATES.ACTIVE;
}

function normalizeOptionalText(value) {
  const normalized = normalizeValue(value);
  return normalized || null;
}

function isLifecycleUnavailableError(error) {
  const message = normalizeValue(error?.message).toLowerCase();
  return (
    message.includes('account_lifecycle') ||
    message.includes('ensure_account_lifecycle') ||
    message.includes('begin_account_delete') ||
    message.includes('complete_account_delete') ||
    message.includes('abort_account_delete') ||
    message.includes('does not exist')
  );
}

function buildLifecycleRow(row = null) {
  return {
    deletedAt: row?.deleted_at || null,
    pendingOperationKey: normalizeOptionalText(row?.pending_operation_key),
    state: normalizeState(row?.state),
    stateReason: normalizeOptionalText(row?.state_reason),
    userId: normalizeOptionalText(row?.user_id),
  };
}

async function callLifecycleRpc(rpcName, payload = {}) {
  const admin = createAdminClient();
  const result = await admin.rpc(rpcName, payload);
  if (result.error) throw result.error;
  return result.data;
}

export async function ensureAccountLifecycle(userId) {
  const normalizedUserId = normalizeValue(userId);
  if (!normalizedUserId) throw new Error('Authenticated user is required');

  try {
    const rpcData = await callLifecycleRpc('ensure_account_lifecycle', {
      p_user_id: normalizedUserId,
    });
    return buildLifecycleRow(rpcData);
  } catch (error) {
    if (!isLifecycleUnavailableError(error)) {
      throw new Error(error?.message || 'Account lifecycle could not be initialized');
    }

    try {
      const admin = createAdminClient();
      const selectResult = await admin
        .from(ACCOUNT_LIFECYCLE_TABLE)
        .select('user_id,state,state_reason,pending_operation_key,deleted_at')
        .eq('user_id', normalizedUserId)
        .maybeSingle();

      if (selectResult.data) return buildLifecycleRow(selectResult.data);

      const insertResult = await admin
        .from(ACCOUNT_LIFECYCLE_TABLE)
        .insert({
          state: ACCOUNT_LIFECYCLE_STATES.ACTIVE,
          state_reason: 'bootstrap',
          user_id: normalizedUserId,
        })
        .select('user_id,state,state_reason,pending_operation_key,deleted_at')
        .maybeSingle();

      if (insertResult.data) return buildLifecycleRow(insertResult.data);
    } catch {}

    return {
      deletedAt: null,
      pendingOperationKey: null,
      state: ACCOUNT_LIFECYCLE_STATES.ACTIVE,
      stateReason: 'lifecycle_unavailable',
      userId: normalizedUserId,
    };
  }
}

export async function assertAccountLifecycleAllowed({
  allowedStates = [ACCOUNT_LIFECYCLE_STATES.ACTIVE],
  userId,
} = {}) {
  const normalizedUserId = normalizeValue(userId);
  if (!normalizedUserId) throw new Error('Authenticated user is required');

  const lifecycle = await ensureAccountLifecycle(normalizedUserId);
  const normalizedAllowedStates = new Set(
    (Array.isArray(allowedStates) ? allowedStates : [allowedStates]).map((s) => normalizeState(s)),
  );

  if (!normalizedAllowedStates.has(lifecycle.state)) {
    if (lifecycle.state === ACCOUNT_LIFECYCLE_STATES.DELETED)
      throw new Error('Account has already been deleted');
    if (lifecycle.state === ACCOUNT_LIFECYCLE_STATES.PENDING_DELETE)
      throw new Error('Account is pending deletion');
    throw new Error('Account is not active');
  }

  return lifecycle;
}

export async function beginAccountDeleteLifecycle({
  idempotencyKey = null,
  requestId = null,
  sessionJti = null,
  userId,
} = {}) {
  const normalizedUserId = normalizeValue(userId);
  if (!normalizedUserId) throw new Error('Authenticated user is required');

  try {
    const rpcData = await callLifecycleRpc('begin_account_delete', {
      p_operation_key: normalizeOptionalText(idempotencyKey),
      p_request_id: normalizeOptionalText(requestId),
      p_session_jti: normalizeOptionalText(sessionJti),
      p_user_id: normalizedUserId,
    });
    const record = Array.isArray(rpcData) ? rpcData[0] : rpcData;
    return {
      accepted: Boolean(record?.accepted),
      reason: normalizeOptionalText(record?.reason) || 'unknown',
      state: normalizeState(record?.state),
    };
  } catch (error) {
    if (!isLifecycleUnavailableError(error)) {
      throw new Error(error?.message || 'Account delete lifecycle could not be started');
    }
    return {
      accepted: true,
      reason: 'lifecycle_unavailable',
      state: ACCOUNT_LIFECYCLE_STATES.PENDING_DELETE,
    };
  }
}

export async function completeAccountDeleteLifecycle({
  metadata = null,
  requestId = null,
  sessionJti = null,
  userId,
} = {}) {
  const normalizedUserId = normalizeValue(userId);
  if (!normalizedUserId) throw new Error('Authenticated user is required');

  try {
    await callLifecycleRpc('complete_account_delete', {
      p_metadata: metadata && typeof metadata === 'object' ? metadata : {},
      p_request_id: normalizeOptionalText(requestId),
      p_session_jti: normalizeOptionalText(sessionJti),
      p_user_id: normalizedUserId,
    });
  } catch (error) {
    if (!isLifecycleUnavailableError(error)) {
      throw new Error(error?.message || 'Account delete lifecycle could not be completed');
    }
  }
}

export async function abortAccountDeleteLifecycle({
  metadata = null,
  reason = 'delete_failed',
  requestId = null,
  userId,
} = {}) {
  const normalizedUserId = normalizeValue(userId);
  if (!normalizedUserId) throw new Error('Authenticated user is required');

  try {
    await callLifecycleRpc('abort_account_delete', {
      p_metadata: metadata && typeof metadata === 'object' ? metadata : {},
      p_reason: normalizeOptionalText(reason) || 'delete_failed',
      p_request_id: normalizeOptionalText(requestId),
      p_user_id: normalizedUserId,
    });
  } catch (error) {
    if (!isLifecycleUnavailableError(error)) {
      throw new Error(error?.message || 'Account delete lifecycle could not be rolled back');
    }
  }
}

export async function resolveEmailAccountState(email) {
  const normalizedEmail = normalizeEmailValue(email);
  if (!normalizedEmail) {
    return {
      email: '',
      exists: false,
      lookup: null,
      profile: { email: '', exists: false, hasUsername: false, id: null, raw: null, username: '' },
      state: EMAIL_ACCOUNT_STATES.AVAILABLE,
      userId: null,
    };
  }

  const admin = createAdminClient();
  const profileResult = await admin
    .from('profiles')
    .select('id, email, username')
    .eq('email', normalizedEmail)
    .maybeSingle();

  const profile = profileResult.data || null;

  return {
    email: normalizedEmail,
    exists: Boolean(profile?.id),
    lookup: null,
    profile: {
      email: normalizeEmailValue(profile?.email),
      exists: Boolean(profile?.id),
      hasUsername: Boolean(normalizeValue(profile?.username)),
      id: normalizeValue(profile?.id) || null,
      raw: profile,
      username: normalizeValue(profile?.username),
    },
    state: profile?.id
      ? EMAIL_ACCOUNT_STATES.EXISTING_EMAIL_ACCOUNT
      : EMAIL_ACCOUNT_STATES.AVAILABLE,
    userId: normalizeValue(profile?.id) || null,
  };
}
