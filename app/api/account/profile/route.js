import { NextResponse } from 'next/server';

import {
  requireSessionRequest,
  resolveOptionalSessionRequest,
} from '@/core/auth/servers/session/authenticated-request.server';
import { SUPABASE_URL } from '@/core/clients/supabase/constants';
import { ACCOUNT_READ_FUNCTION, ACCOUNT_WRITE_FUNCTION } from '@/core/services/account/contracts';
import { publishUserEvent } from '@/core/services/realtime/user-events.server';
import { getOrLoadCachedValue } from '@/core/services/shared/memory-cache.server';
import { invokeInternalEdgeFunction } from '@/core/services/shared/supabase-edge-internal.server';

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
  return normalizeValue(process.env.SUPABASE_PROFILE_MEDIA_BUCKET) || DEFAULT_MEDIA_BUCKET;
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

  const payload = await invokeInternalEdgeFunction(ACCOUNT_READ_FUNCTION, {
    body: {
      resource: 'profile',
      userId: normalizedUserId,
      viewerId: normalizedUserId,
    },
  }).catch(() => null);

  const profile = payload?.profile || null;

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

  const payload = await invokeInternalEdgeFunction(ACCOUNT_READ_FUNCTION, {
    body: {
      resource: 'profile',
      userId: normalizedUserId,
      viewerId: normalizedUserId,
    },
  }).catch(() => null);

  return payload?.profile || null;
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
    let payload;

    try {
      payload = await invokeInternalEdgeFunction(ACCOUNT_WRITE_FUNCTION, {
        body: writeBody,
      });
    } catch (error) {
      const canRecoverFromRpcCatchError =
        action === 'update' && requestedIsPrivate !== undefined && isRpcCatchTypeError(error);

      if (!canRecoverFromRpcCatchError) {
        throw error;
      }

      const profileAfterError = await getCurrentProfileSnapshot(authContext.userId);

      if (profileAfterError && resolveProfileIsPrivate(profileAfterError) === requestedIsPrivate) {
        payload = {
          action,
          profile: profileAfterError,
        };
      } else {
        payload = await invokeInternalEdgeFunction(ACCOUNT_WRITE_FUNCTION, {
          body: writeBody,
        });
      }
    }

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
