import { normalizeEmailValue, normalizeValue } from '@/shared/utils';
import { createAdminClient } from '@/infrastructure/supabase/admin';
import { validateUsername } from '@/domains/account/utils';
import { ACCOUNT_LIFECYCLE_TABLE, resolveAuthCapabilities, resolveProviderIds } from '@/domains/auth/utils';

// ============================================================
// Account State Enums
// ============================================================

export const ACCOUNT_LIFECYCLE_STATES = Object.freeze({
  ACTIVE: 'ACTIVE',
  DELETED: 'DELETED',
  PENDING_CHANGE: 'PENDING_CHANGE',
  PENDING_DELETE: 'PENDING_DELETE',
});

export const EMAIL_ACCOUNT_STATES = Object.freeze({
  AVAILABLE: 'available',
  EXISTING_GOOGLE_ONLY: 'existing_google_only',
  EXISTING_PASSWORD_ACCOUNT: 'existing_password_account',
  RECOVERABLE_PASSWORD_ORPHAN: 'recoverable_password_orphan',
});

// ============================================================
// Account Bootstrap & Record Creation
// ============================================================

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

export async function ensurePasswordAccountRecord({
  avatarUrl = null,
  displayName,
  email,
  userId,
  username,
}) {
  const normalizedUserId = normalizeValue(userId);
  const normalizedEmail = normalizeEmailValue(email);
  const normalizedUsername = validateUsername(username);
  const resolvedDisplayName = normalizeValue(displayName) || normalizedUsername;

  if (!normalizedUserId || !normalizedEmail) {
    throw new Error('User ID and email are required to create the account profile');
  }

  await claimUsernameForProfile({
    avatarUrl,
    displayName: resolvedDisplayName,
    email: normalizedEmail,
    preserveExisting: false,
    userId: normalizedUserId,
    username: normalizedUsername,
  });

  const profileResult = await createAdminClient()
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

// ============================================================
// Account Deletion & Purging
// ============================================================

export function hasPasswordProvider(userRecord) {
  const providerIds = resolveProviderIds({
    providerData: userRecord?.providerData || [],
    appMetadata: userRecord?.app_metadata || {},
  });

  return resolveAuthCapabilities({
    providerIds,
    email: userRecord?.email || null,
  }).passwordEnabled;
}

export function assertPasswordProviderLinked(userRecord) {
  if (!hasPasswordProvider(userRecord)) {
    throw new Error('This account does not have email/password sign-in enabled');
  }
}

export async function purgeAccountData({ userId }) {
  const normalizedUserId = normalizeValue(userId);
  if (!normalizedUserId) throw new Error('Authenticated user is required');

  const admin = createAdminClient();
  const executeDelete = async (query, fallbackMessage) => {
    const res = await query;
    if (res?.error) throw new Error(res.error.message || fallbackMessage);
  };

  await executeDelete(
    admin.from('review_likes').delete().eq('user_id', normalizedUserId),
    'Review likes could not be deleted',
  );
  await executeDelete(
    admin.from('list_likes').delete().eq('user_id', normalizedUserId),
    'List likes could not be deleted',
  );
  await executeDelete(
    admin
      .from('follows')
      .delete()
      .or(`follower_id.eq.${normalizedUserId},following_id.eq.${normalizedUserId}`),
    'Follow relations could not be deleted',
  );
  await executeDelete(
    admin.from('notifications').delete().eq('user_id', normalizedUserId),
    'Notifications could not be deleted',
  );
  await executeDelete(
    admin.from('profiles').delete().eq('id', normalizedUserId),
    'Profile could not be deleted',
  );
}

// ============================================================
// Account Lifecycle & State Management
// ============================================================

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
    const rpcData = await callLifecycleRpc('ensure_account_lifecycle', { p_user_id: normalizedUserId });
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
    if (lifecycle.state === ACCOUNT_LIFECYCLE_STATES.DELETED) throw new Error('Account has already been deleted');
    if (lifecycle.state === ACCOUNT_LIFECYCLE_STATES.PENDING_DELETE) throw new Error('Account is pending deletion');
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
    return { accepted: true, reason: 'lifecycle_unavailable', state: ACCOUNT_LIFECYCLE_STATES.PENDING_DELETE };
  }
}

export async function completeAccountDeleteLifecycle({ metadata = null, requestId = null, sessionJti = null, userId } = {}) {
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

export async function abortAccountDeleteLifecycle({ metadata = null, reason = 'delete_failed', requestId = null, userId } = {}) {
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
    state: profile?.id ? EMAIL_ACCOUNT_STATES.EXISTING_PASSWORD_ACCOUNT : EMAIL_ACCOUNT_STATES.AVAILABLE,
    userId: normalizeValue(profile?.id) || null,
  };
}
