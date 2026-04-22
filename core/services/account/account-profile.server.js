import 'server-only';

import { createAdminClient } from '@/core/clients/supabase/admin';
import { ACCOUNT_READ_FUNCTION } from '@/core/services/account/account.constants';
import { getAccountSnapshotByUserId } from '@/core/services/account/account.server';
import { cleanString } from '@/core/utils';
import { invokeInternalEdgeFunction } from '@/core/services/shared/supabase-edge-internal.server';
import { cache } from 'react';

const FOLLOW_STATUS_ACCEPTED = 'accepted';

function normalizeValue(value) {
  return String(value || '').trim();
}

function isUuidLike(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(normalizeValue(value));
}

function assertResult(result, fallbackMessage) {
  if (result?.error) {
    const error = result.error;
    const message = String(error?.message || '').toLowerCase();

    if (message.includes('fetch failed') || message.includes('socket') || message.includes('connection')) {
      console.error(`[Supabase Connection Error] ${fallbackMessage}:`, error);
      return { data: null, error };
    }

    throw new Error(error.message || fallbackMessage);
  }

  return result;
}

export const canViewerAccessUserContent = cache(async ({ client = null, ownerId, viewerId = null }) => {
  const normalizedOwnerId = normalizeValue(ownerId);
  const normalizedViewerId = normalizeValue(viewerId);

  if (!normalizedOwnerId) {
    return false;
  }

  if (normalizedViewerId && normalizedViewerId === normalizedOwnerId) {
    return true;
  }

  const admin = client || createAdminClient();
  const profileResult = await admin.from('profiles').select('is_private').eq('id', normalizedOwnerId).maybeSingle();

  assertResult(profileResult, 'Profile visibility could not be checked');

  if (!profileResult.data) {
    return false;
  }

  if (profileResult.data.is_private !== true) {
    return true;
  }

  if (!normalizedViewerId) {
    return false;
  }

  const followResult = await admin
    .from('follows')
    .select('status')
    .eq('follower_id', normalizedViewerId)
    .eq('following_id', normalizedOwnerId)
    .eq('status', FOLLOW_STATUS_ACCEPTED)
    .maybeSingle();

  assertResult(followResult, 'Profile visibility could not be checked');
  return Boolean(followResult.data);
});

export function createPrivateProfileError() {
  const error = new Error('This profile is private');
  error.status = 403;
  return error;
}

async function resolveAccountIdByUsernameLegacy(username) {
  const normalizedUsername = cleanString(username).toLowerCase();

  if (!normalizedUsername) {
    return null;
  }

  const admin = createAdminClient();
  const usernameLookup = await admin
    .from('usernames')
    .select('user_id')
    .eq('username_lower', normalizedUsername)
    .maybeSingle();

  assertResult(usernameLookup, 'Username could not be resolved');

  if (usernameLookup.data?.user_id) {
    return usernameLookup.data.user_id;
  }

  const profileByUsernameLookup = await admin
    .from('profiles')
    .select('id')
    .eq('username_lower', normalizedUsername)
    .maybeSingle();

  assertResult(profileByUsernameLookup, 'Username could not be resolved');

  if (profileByUsernameLookup.data?.id) {
    return profileByUsernameLookup.data.id;
  }

  if (!isUuidLike(normalizedUsername)) {
    return null;
  }

  const profileByIdLookup = await admin.from('profiles').select('id').eq('id', normalizedUsername).maybeSingle();

  assertResult(profileByIdLookup, 'Username could not be resolved');
  return profileByIdLookup.data?.id || null;
}

export const getAccountIdByUsername = cache(async (username) => {
  const normalizedUsername = cleanString(username);

  if (!normalizedUsername) {
    return null;
  }

  try {
    const payload = await invokeInternalEdgeFunction(ACCOUNT_READ_FUNCTION, {
      body: {
        resource: 'resolve',
        username: normalizedUsername,
      },
    });

    return payload?.userId || null;
  } catch {
    return resolveAccountIdByUsernameLegacy(normalizedUsername);
  }
});

async function loadAccountProfileFallback(userId, viewerId = null) {
  const includePrivateDetails = await canViewerAccessUserContent({
    ownerId: userId,
    viewerId,
  }).catch(() => false);
  const snapshot = await getAccountSnapshotByUserId(userId, {
    includePrivateDetails,
  });
  return snapshot.profile || null;
}

export async function getAccountProfileByUserId(userId, { viewerId = null } = {}) {
  const normalizedUserId = normalizeValue(userId);

  if (!normalizedUserId) {
    return null;
  }

  try {
    const payload = await invokeInternalEdgeFunction(ACCOUNT_READ_FUNCTION, {
      body: {
        resource: 'profile',
        userId: normalizedUserId,
        viewerId: normalizeValue(viewerId) || null,
      },
    });

    return payload?.profile || null;
  } catch {
    return loadAccountProfileFallback(normalizedUserId, viewerId);
  }
}

export async function getAccountProfileByUsername(username, { viewerId = null } = {}) {
  const normalizedUsername = cleanString(username);

  if (!normalizedUsername) {
    return null;
  }

  try {
    const payload = await invokeInternalEdgeFunction(ACCOUNT_READ_FUNCTION, {
      body: {
        resource: 'profile',
        username: normalizedUsername,
        viewerId: normalizeValue(viewerId) || null,
      },
    });

    return payload?.profile || null;
  } catch {
    const accountId = await getAccountIdByUsername(normalizedUsername);

    if (!accountId) {
      return null;
    }

    return loadAccountProfileFallback(accountId, viewerId);
  }
}
