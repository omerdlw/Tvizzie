import { NextResponse } from 'next/server';

import { ensurePasswordAccountRecord } from '@/core/auth/servers/account.js';
import { createAdminClient } from '@/core/clients/supabase/admin';
import { requireSessionRequest, resolveOptionalSessionRequest } from '@/core/auth/servers/session.js';
import { SUPABASE_URL } from '@/core/clients/supabase/constants';
import { getEditableAccountSnapshotByUserId } from '@/core/services/account/account.server';
import { ACCOUNT_READ_FUNCTION, ACCOUNT_WRITE_FUNCTION } from '@/core/services/account/account.constants';
import { publishUserEvent } from '@/core/services/realtime/user-events.server';
import { executeWriteRollout, getOrLoadCachedValue, invokeInternalEdgeFunction } from '@/core/services/shared/server';
import { normalizeAccountDisplayNameSearchValue, sanitizeUsername, validateUsername } from '@/core/utils/account';

const DEFAULT_MEDIA_BUCKET = 'profile-media';

function normalizeValue(value) {
  return String(value || '').trim();
}

function normalizeLower(value) {
  return normalizeValue(value).toLowerCase();
}

function normalizeOptionalBoolean(value) {
  if (value === undefined) {
    return undefined;
  }

  return Boolean(value);
}

function resolveProfileIsPrivate(profile = null) {
  return profile?.isPrivate === true || profile?.is_private === true;
}

function isRpcCatchTypeError(error) {
  const message = normalizeLower(error?.message || '');

  return message.includes('rpc') && message.includes('.catch is not a function');
}

function resolveMediaBucket() {
  return DEFAULT_MEDIA_BUCKET;
}

function resolveSupabaseMediaHosts() {
  const hosts = new Set();
  const rawUrl = normalizeValue(SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL);

  if (!rawUrl) {
    return hosts;
  }

  try {
    const parsed = new URL(rawUrl);
    const baseHost = normalizeLower(parsed.host);

    if (baseHost) {
      hosts.add(baseHost);

      if (baseHost.endsWith('.supabase.co')) {
        hosts.add(baseHost.replace('.supabase.co', '.storage.supabase.co'));
      }

      if (baseHost.endsWith('.supabase.in')) {
        hosts.add(baseHost.replace('.supabase.in', '.storage.supabase.in'));
      }

      if (baseHost.endsWith('.supabase.red')) {
        hosts.add(baseHost.replace('.supabase.red', '.storage.supabase.red'));
      }
    }
  } catch {
    return hosts;
  }

  return hosts;
}

function extractStorageObjectPath(url, bucket) {
  const normalizedBucket = normalizeValue(bucket);

  if (!normalizedBucket) {
    return null;
  }

  const parts = url.pathname.split('/').filter(Boolean);

  if (parts.length < 4) {
    return null;
  }

  if (parts[0] === 'storage' && parts[1] === 'v1' && parts[2] === 'object' && parts[3] === 'public') {
    if (parts[4] !== normalizedBucket) {
      return null;
    }

    try {
      return decodeURIComponent(parts.slice(5).join('/'));
    } catch {
      return null;
    }
  }

  if (parts[0] === 'object' && parts[1] === 'public') {
    if (parts[2] !== normalizedBucket) {
      return null;
    }

    try {
      return decodeURIComponent(parts.slice(3).join('/'));
    } catch {
      return null;
    }
  }

  return null;
}

const SUPABASE_MEDIA_HOSTS = resolveSupabaseMediaHosts();

function normalizeAndValidateMediaUrlInput(value) {
  if (value === undefined) {
    return undefined;
  }

  const normalized = normalizeValue(value);

  if (!normalized) {
    return null;
  }

  let parsed;

  try {
    parsed = new URL(normalized);
  } catch {
    throw new Error('Image URLs must start with http:// or https://');
  }

  const protocol = normalizeLower(parsed.protocol);

  if (protocol !== 'http:' && protocol !== 'https:') {
    throw new Error('Image URLs must start with http:// or https://');
  }

  return normalized;
}

function isOwnedProfileMediaUrl(value, { target, userId }) {
  const normalized = normalizeValue(value);

  if (!normalized || !userId) {
    return false;
  }

  let parsed;

  try {
    parsed = new URL(normalized);
  } catch {
    return false;
  }

  if (!SUPABASE_MEDIA_HOSTS.has(normalizeLower(parsed.host))) {
    return false;
  }

  const objectPath = extractStorageObjectPath(parsed, resolveMediaBucket());
  const expectedPrefix = `accounts/${userId}/${target}-`;

  return Boolean(objectPath && objectPath.startsWith(expectedPrefix));
}

function resolveProfileMediaUrl(value, { target, userId, currentValue = null }) {
  const normalized = normalizeAndValidateMediaUrlInput(value);

  if (normalized === undefined || normalized === null) {
    return normalized;
  }

  if (normalizeValue(currentValue) && normalized === normalizeValue(currentValue)) {
    return normalized;
  }

  if (isOwnedProfileMediaUrl(normalized, { target, userId })) {
    return normalized;
  }

  return normalized;
}

function resolveProfileWriteMediaUrl(value, { action, currentValue = null, target, userId }) {
  if (action === 'ensure') {
    const preservedValue = normalizeValue(currentValue) || null;

    if (preservedValue) {
      return preservedValue;
    }
  }

  return resolveProfileMediaUrl(value, { target, userId, currentValue });
}

async function getCurrentProfileMediaSnapshot(userId) {
  const normalizedUserId = normalizeValue(userId);

  if (!normalizedUserId) {
    return {
      avatarUrl: null,
      bannerUrl: null,
    };
  }

  const snapshot = await getEditableAccountSnapshotByUserId(normalizedUserId).catch(() => null);
  const profile = snapshot?.profile || null;

  return {
    avatarUrl: normalizeValue(profile?.avatarUrl || profile?.avatar_url || '') || null,
    bannerUrl: normalizeValue(profile?.bannerUrl || profile?.banner_url || '') || null,
  };
}

async function getCurrentProfileSnapshot(userId) {
  const normalizedUserId = normalizeValue(userId);

  if (!normalizedUserId) {
    return null;
  }

  const snapshot = await getEditableAccountSnapshotByUserId(normalizedUserId).catch(() => null);
  return snapshot?.profile || null;
}

function buildUsernameCandidate(baseValue, suffix = '') {
  const rawBase = sanitizeUsername(baseValue) || 'user';
  const maxBaseLength = Math.max(1, 24 - suffix.length);
  const trimmedBase = rawBase.slice(0, maxBaseLength).replace(/[_-]+$/g, '') || 'user';
  const candidate = `${trimmedBase}${suffix}`;
  const normalizedCandidate =
    candidate.length >= 3 ? candidate : `${candidate}${'user'.slice(0, 3 - candidate.length)}`;

  return validateUsername(normalizedCandidate);
}

async function isUsernameAvailable(admin, username) {
  const result = await admin.from('usernames').select('user_id').eq('username_lower', username).maybeSingle();

  if (result.error) {
    throw new Error(result.error.message || 'Username availability could not be checked');
  }

  return !result.data?.user_id;
}

async function resolveAvailableUsername({ admin, displayName, email, preferredUsername, userId }) {
  if (preferredUsername !== undefined && preferredUsername !== null && normalizeValue(preferredUsername)) {
    return validateUsername(preferredUsername);
  }

  const seeds = [
    normalizeValue(email).split('@')[0],
    normalizeValue(displayName),
    normalizeValue(userId).slice(0, 12),
    'user',
  ].filter(Boolean);

  for (const seed of seeds) {
    const baseCandidate = buildUsernameCandidate(seed);

    if (await isUsernameAvailable(admin, baseCandidate)) {
      return baseCandidate;
    }

    for (let index = 1; index <= 50; index += 1) {
      const candidate = buildUsernameCandidate(seed, String(index));

      if (await isUsernameAvailable(admin, candidate)) {
        return candidate;
      }
    }
  }

  throw new Error('Could not generate an available username for this account');
}

async function claimUsernameForProfile({
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
    p_email: normalizeLower(email) || null,
    p_fail_if_profile_has_username: Boolean(failIfProfileHasUsername),
    p_preserve_existing: Boolean(preserveExisting),
    p_user_id: normalizeValue(userId),
    p_username: validateUsername(username),
  });

  if (error) {
    throw new Error(error.message || 'Username could not be claimed');
  }
}

async function writeLegacyProfile({
  action,
  avatarUrl,
  bannerUrl,
  description,
  displayName,
  email,
  isPrivate,
  userId,
  username,
}) {
  const normalizedUserId = normalizeValue(userId);

  if (!normalizedUserId) {
    throw new Error('Authenticated user is required');
  }

  const admin = createAdminClient();
  const currentSnapshot = await getEditableAccountSnapshotByUserId(normalizedUserId).catch(() => null);
  const currentProfile = currentSnapshot?.profile || null;

  if (action === 'ensure') {
    if (!currentProfile?.id) {
      const resolvedUsername = await resolveAvailableUsername({
        admin,
        displayName,
        email,
        preferredUsername: username,
        userId: normalizedUserId,
      });

      await ensurePasswordAccountRecord({
        avatarUrl,
        displayName: normalizeValue(displayName) || resolvedUsername,
        email: normalizeLower(email),
        userId: normalizedUserId,
        username: resolvedUsername,
      });
    }

    const ensuredProfile = await getCurrentProfileSnapshot(normalizedUserId);

    return {
      action,
      ok: true,
      profile: ensuredProfile,
    };
  }

  const updates = {
    updated_at: new Date().toISOString(),
  };

  if (email !== undefined) {
    updates.email = normalizeLower(email) || null;
  }

  if (displayName !== undefined) {
    const normalizedDisplayName = normalizeValue(displayName) || 'Anonymous User';
    updates.display_name = normalizedDisplayName;
    updates.display_name_lower = normalizeAccountDisplayNameSearchValue(normalizedDisplayName);
  }

  if (description !== undefined) {
    updates.description = normalizeValue(description);
  }

  if (avatarUrl !== undefined) {
    updates.avatar_url = avatarUrl;
  }

  if (bannerUrl !== undefined) {
    updates.banner_url = bannerUrl;
  }

  if (isPrivate !== undefined) {
    updates.is_private = Boolean(isPrivate);
  }

  const updateResult = await admin.from('profiles').update(updates).eq('id', normalizedUserId);

  if (updateResult.error) {
    throw new Error(updateResult.error.message || 'Profile could not be updated');
  }

  const normalizedRequestedUsername = normalizeValue(username);
  const currentUsername = normalizeValue(currentProfile?.username);

  if (normalizedRequestedUsername && normalizedRequestedUsername !== currentUsername) {
    await claimUsernameForProfile({
      avatarUrl: avatarUrl === undefined ? currentProfile?.avatarUrl : avatarUrl,
      displayName: displayName === undefined ? currentProfile?.displayName : displayName,
      email: email === undefined ? currentProfile?.email : email,
      userId: normalizedUserId,
      username: normalizedRequestedUsername,
    });
  }

  const profile = await getCurrentProfileSnapshot(normalizedUserId);

  return {
    action,
    ok: true,
    profile,
  };
}

function getProfileCacheKey({ userId = '', username = '', viewerId = '' } = {}) {
  if (userId) {
    return `id:${userId}|viewer:${viewerId || ''}`;
  }

  return `username:${username}|viewer:${viewerId || ''}`;
}

export async function GET(request) {
  try {
    const authContext = await resolveOptionalSessionRequest(request);
    const { searchParams } = new URL(request.url);
    const userId = normalizeValue(searchParams.get('userId'));
    const username = normalizeValue(searchParams.get('username'));
    const viewerId = normalizeValue(authContext?.userId || '');

    if (!userId && !username) {
      return NextResponse.json(
        {
          error: 'userId or username is required',
        },
        { status: 400 }
      );
    }

    const cacheKey = getProfileCacheKey({ userId, username, viewerId });
    const payload = await getOrLoadCachedValue({
      cacheKey: `account-profile|${cacheKey}`,
      enabled: true,
      ttlMs: 5000,
      loader: () =>
        invokeInternalEdgeFunction(ACCOUNT_READ_FUNCTION, {
          body: {
            resource: 'profile',
            ...(userId ? { userId } : { username }),
            viewerId: viewerId || null,
          },
        }),
    });

    return NextResponse.json({
      profile: payload?.profile || null,
    });
  } catch (error) {
    const status = Number.isFinite(Number(error?.status)) ? Number(error.status) : 500;

    return NextResponse.json(
      {
        error: String(error?.message || 'Profile could not be loaded'),
      },
      { status }
    );
  }
}

export async function POST(request) {
  try {
    const authContext = await requireSessionRequest(request, {
      allowBearerFallback: true,
    });
    const body = await request.json().catch(() => ({}));
    const action = normalizeValue(body?.action).toLowerCase();

    if (action !== 'ensure' && action !== 'update' && action !== 'sync-email') {
      return NextResponse.json({ error: 'action must be one of: ensure, update, sync-email' }, { status: 400 });
    }

    const currentMediaSnapshot =
      action === 'sync-email'
        ? { avatarUrl: null, bannerUrl: null }
        : await getCurrentProfileMediaSnapshot(authContext.userId);

    const avatarUrl = resolveProfileWriteMediaUrl(body?.avatarUrl, {
      action,
      target: 'avatar',
      userId: authContext.userId,
      currentValue: currentMediaSnapshot.avatarUrl,
    });
    const bannerUrl = resolveProfileWriteMediaUrl(body?.bannerUrl, {
      action,
      target: 'banner',
      userId: authContext.userId,
      currentValue: currentMediaSnapshot.bannerUrl,
    });

    const writeBody = {
      action,
      userId: authContext.userId,
      email: body?.email,
      username: body?.username,
      displayName: body?.displayName,
      avatarUrl,
      bannerUrl,
      description: body?.description,
      isPrivate: body?.isPrivate,
    };
    const requestedIsPrivate = normalizeOptionalBoolean(body?.isPrivate);
    const writeResult = await executeWriteRollout({
      domain: 'account',
      endpoint: 'account-profile-write',
      userId: authContext.userId,
      legacyWrite: async () =>
        writeLegacyProfile({
          ...writeBody,
          isPrivate: requestedIsPrivate,
        }),
      edgeWrite: async () => {
        try {
          return await invokeInternalEdgeFunction(ACCOUNT_WRITE_FUNCTION, {
            body: writeBody,
          });
        } catch (error) {
          if (Number(error?.status) === 404) {
            return writeLegacyProfile({
              ...writeBody,
              isPrivate: requestedIsPrivate,
            });
          }

          const canRecoverFromRpcCatchError =
            action === 'update' && requestedIsPrivate !== undefined && isRpcCatchTypeError(error);

          if (!canRecoverFromRpcCatchError) {
            throw error;
          }

          const profileAfterError = await getCurrentProfileSnapshot(authContext.userId);

          if (profileAfterError && resolveProfileIsPrivate(profileAfterError) === requestedIsPrivate) {
            return {
              action,
              ok: true,
              profile: profileAfterError,
            };
          }

          return invokeInternalEdgeFunction(ACCOUNT_WRITE_FUNCTION, {
            body: writeBody,
          });
        }
      },
      logger(entry) {
        console.warn('[Rollout][account-profile-write]', entry);
      },
      fallbackOnRecoverableEdgeError: true,
      requestId: request.headers.get('x-request-id') || null,
    });
    const payload = writeResult?.result || null;

    publishUserEvent(authContext.userId, 'account', {
      action: payload?.action || action,
      reason: 'profile-updated',
    });

    return NextResponse.json({
      ok: true,
      action: payload?.action || action,
      profile: payload?.profile || null,
    });
  } catch (error) {
    const status = Number.isFinite(Number(error?.status)) ? Number(error.status) : 500;

    return NextResponse.json(
      {
        error: String(error?.message || 'Account profile write failed'),
      },
      { status }
    );
  }
}
