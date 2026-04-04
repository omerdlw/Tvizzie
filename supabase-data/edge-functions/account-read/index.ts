import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

import { normalizeProfileResponse } from '../_shared/account.ts';
import { assertMethod, errorResponse, jsonResponse, mapErrorToStatus, readJsonBody } from '../_shared/http.ts';
import { assertInternalAccess } from '../_shared/internal.ts';
import { normalizeBoolean, normalizeInteger, normalizeValue } from '../_shared/normalize.ts';
import { createAdminClient } from '../_shared/supabase.ts';
import { getJsonCache, setJsonCache, sha256Hex } from '../_shared/upstash.ts';

type AccountReadResource = 'profile' | 'resolve' | 'search';

type AccountReadRequest = {
  limitCount?: number | string | null;
  resource?: AccountReadResource;
  searchTerm?: string | null;
  userId?: string | null;
  username?: string | null;
  viewerId?: string | null;
};

const ACCOUNT_SEARCH_LIMIT = 20;
const PROFILE_SELECT = [
  'avatar_url',
  'banner_url',
  'created_at',
  'description',
  'display_name',
  'display_name_lower',
  'email',
  'favorite_showcase',
  'id',
  'is_private',
  'last_activity_at',
  'updated_at',
  'username',
  'username_lower',
].join(',');

const COUNTER_SELECT = [
  'follower_count',
  'following_count',
  'likes_count',
  'lists_count',
  'watched_count',
  'watchlist_count',
].join(',');

const ACCOUNT_SEARCH_SELECT = [
  'avatar_url',
  'banner_url',
  'created_at',
  'description',
  'display_name',
  'display_name_lower',
  'id',
  'is_private',
  'updated_at',
  'username',
  'username_lower',
].join(',');

const CACHE_ENABLED = normalizeBoolean(Deno.env.get('ACCOUNT_READ_CACHE_ENABLED'), true);
const CACHE_KEY_PREFIX = normalizeValue(Deno.env.get('ACCOUNT_READ_CACHE_KEY_PREFIX')) || 'tvz:account:read:v1';
const CACHE_TTL_SECONDS = normalizeInteger(Deno.env.get('ACCOUNT_READ_CACHE_TTL_SECONDS'), {
  fallback: 10,
  min: 2,
  max: 300,
});

function normalizeResource(value: unknown): AccountReadResource {
  const resource = normalizeValue(value).toLowerCase();

  if (resource === 'profile' || resource === 'resolve' || resource === 'search') {
    return resource;
  }

  throw new Error('resource must be one of: profile, resolve, search');
}

function normalizeDisplayNameSearchValue(value: unknown) {
  return normalizeValue(value).toLocaleLowerCase();
}

function buildUsernameCandidate(value: unknown) {
  const turkishMap: Record<string, string> = {
    '\u00e7': 'c',
    '\u011f': 'g',
    '\u0131': 'i',
    '\u00f6': 'o',
    '\u015f': 's',
    '\u00fc': 'u',
  };

  const normalized = normalizeValue(value)
    .toLowerCase()
    .replace(/[\u00e7\u011f\u0131\u015f\u00fc\u00f6]/g, (char) => turkishMap[char] || char);

  return normalized
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_{2,}/g, '_');
}

async function buildCacheKey(resource: AccountReadResource, payload: unknown) {
  if (!CACHE_ENABLED) {
    return null;
  }

  const rawKey = JSON.stringify({
    payload,
    resource,
  });
  const hashed = await sha256Hex(rawKey);

  return `${CACHE_KEY_PREFIX}:${resource}:${hashed}`;
}

async function readCache<T>(key: string | null) {
  if (!key || !CACHE_ENABLED) {
    return null;
  }

  return getJsonCache<T>(key);
}

async function writeCache(key: string | null, value: unknown) {
  if (!key || !CACHE_ENABLED) {
    return;
  }

  await setJsonCache(key, CACHE_TTL_SECONDS, value);
}

async function canViewerAccessUserContent(
  admin: ReturnType<typeof createAdminClient>,
  {
    ownerId,
    viewerId,
  }: {
    ownerId: string;
    viewerId: string | null;
  }
) {
  if (!ownerId) {
    return false;
  }

  if (viewerId && ownerId === viewerId) {
    return true;
  }

  const profileResult = await admin.from('profiles').select('is_private').eq('id', ownerId).maybeSingle();

  if (profileResult.error) {
    throw new Error(profileResult.error.message || 'Profile visibility could not be checked');
  }

  if (!profileResult.data) {
    return false;
  }

  if (profileResult.data.is_private !== true) {
    return true;
  }

  if (!viewerId) {
    return false;
  }

  const followResult = await admin
    .from('follows')
    .select('status')
    .eq('follower_id', viewerId)
    .eq('following_id', ownerId)
    .eq('status', 'accepted')
    .maybeSingle();

  if (followResult.error) {
    throw new Error(followResult.error.message || 'Profile visibility could not be checked');
  }

  return Boolean(followResult.data);
}

async function resolveUserIdByUsername(admin: ReturnType<typeof createAdminClient>, username: string) {
  const result = await admin.from('usernames').select('user_id').eq('username_lower', username).maybeSingle();

  if (result.error) {
    throw new Error(result.error.message || 'Username could not be resolved');
  }

  return normalizeValue(result.data?.user_id) || null;
}

async function loadProfile(
  admin: ReturnType<typeof createAdminClient>,
  {
    userId,
    viewerId,
  }: {
    userId: string;
    viewerId: string | null;
  }
) {
  const includePrivateDetails = await canViewerAccessUserContent(admin, {
    ownerId: userId,
    viewerId,
  }).catch(() => false);

  const [profileResult, countersResult] = await Promise.all([
    admin.from('profiles').select(PROFILE_SELECT).eq('id', userId).maybeSingle(),
    admin.from('profile_counters').select(COUNTER_SELECT).eq('user_id', userId).maybeSingle(),
  ]);

  if (profileResult.error) {
    throw new Error(profileResult.error.message || 'Profile could not be loaded');
  }

  if (countersResult.error) {
    throw new Error(countersResult.error.message || 'Profile counters could not be loaded');
  }

  const snapshot = normalizeProfileResponse(
    (profileResult.data || null) as Record<string, unknown> | null,
    (countersResult.data || null) as Record<string, unknown> | null
  );

  if (!snapshot) {
    return null;
  }

  if (snapshot.isPrivate && !includePrivateDetails) {
    return {
      ...snapshot,
      favoriteShowcase: [],
      lastActivityAt: null,
      likesCount: 0,
      listsCount: 0,
      watchedCount: 0,
      watchlistCount: 0,
    };
  }

  return snapshot;
}

function buildAccountSearchScore(
  profile: {
    usernameLower: string | null;
    displayName: string | null;
    displayNameLower: string | null;
  },
  rawSearchTerm: string,
  normalizedUsername: string,
  normalizedDisplayName: string
) {
  const username = profile.usernameLower || '';
  const displayName = profile.displayName || '';
  const displayNameLower = profile.displayNameLower || normalizeDisplayNameSearchValue(displayName);

  let score = 0;

  if (normalizedUsername) {
    if (username === normalizedUsername) {
      score += 120;
    } else if (username.startsWith(normalizedUsername)) {
      score += 90;
    }
  }

  if (displayNameLower === normalizedDisplayName) {
    score += 110;
  } else if (displayNameLower.startsWith(normalizedDisplayName)) {
    score += 70;
  } else if (displayName.toLowerCase().startsWith(rawSearchTerm.toLowerCase())) {
    score += 50;
  }

  return score;
}

async function searchProfiles(
  admin: ReturnType<typeof createAdminClient>,
  {
    limitCount,
    searchTerm,
  }: {
    limitCount: number;
    searchTerm: string;
  }
) {
  const normalizedUsername = buildUsernameCandidate(searchTerm);
  const normalizedDisplayName = normalizeDisplayNameSearchValue(searchTerm);
  const resolvedLimitCount = normalizeInteger(limitCount, {
    fallback: 6,
    min: 1,
    max: ACCOUNT_SEARCH_LIMIT,
  });

  const result = await admin
    .from('profiles')
    .select(ACCOUNT_SEARCH_SELECT)
    .or([`username_lower.ilike.${normalizedUsername}%`, `display_name_lower.ilike.${normalizedDisplayName}%`].join(','))
    .limit(resolvedLimitCount * 2);

  if (result.error) {
    throw new Error(result.error.message || 'Account search failed');
  }

  return (result.data || [])
    .map((row) => ({
      avatarUrl: row.avatar_url || null,
      bannerUrl: row.banner_url || null,
      createdAt: normalizeValue(row.created_at) || null,
      description: normalizeValue(row.description) || '',
      displayName: normalizeValue(row.display_name) || 'Anonymous User',
      displayNameLower:
        normalizeValue(row.display_name_lower) || normalizeDisplayNameSearchValue(row.display_name || 'Anonymous User'),
      id: normalizeValue(row.id) || null,
      isPrivate: row.is_private === true,
      updatedAt: normalizeValue(row.updated_at) || null,
      username: normalizeValue(row.username) || null,
      usernameLower: normalizeValue(row.username_lower) || null,
    }))
    .filter((profile) => {
      const username = profile.usernameLower || '';
      const displayName = profile.displayNameLower || normalizeDisplayNameSearchValue(profile.displayName);

      return (
        (normalizedUsername && username.startsWith(normalizedUsername)) || displayName.startsWith(normalizedDisplayName)
      );
    })
    .sort((left, right) => {
      const scoreDiff =
        buildAccountSearchScore(right, searchTerm, normalizedUsername, normalizedDisplayName) -
        buildAccountSearchScore(left, searchTerm, normalizedUsername, normalizedDisplayName);

      if (scoreDiff !== 0) {
        return scoreDiff;
      }

      return (left.displayName || '').localeCompare(right.displayName || '');
    })
    .slice(0, resolvedLimitCount);
}

Deno.serve(async (request: Request) => {
  try {
    assertMethod(request, ['POST']);
    assertInternalAccess(request);

    const payload = await readJsonBody<AccountReadRequest>(request);
    const resource = normalizeResource(payload.resource);
    const admin = createAdminClient();

    if (resource === 'resolve') {
      const username = buildUsernameCandidate(payload.username);

      if (!username) {
        throw new Error('username is required');
      }

      const cacheKey = await buildCacheKey(resource, {
        username,
      });
      const cached = await readCache<{ userId: string | null }>(cacheKey);

      if (cached) {
        return jsonResponse(200, {
          ok: true,
          resource,
          userId: cached.userId,
        });
      }

      const userId = await resolveUserIdByUsername(admin, username);
      await writeCache(cacheKey, { userId });

      return jsonResponse(200, {
        ok: true,
        resource,
        userId,
      });
    }

    if (resource === 'search') {
      const searchTerm = normalizeValue(payload.searchTerm);

      if (!searchTerm) {
        return jsonResponse(200, {
          items: [],
          ok: true,
          resource,
        });
      }

      const limitCount = normalizeInteger(payload.limitCount, {
        fallback: 6,
        min: 1,
        max: ACCOUNT_SEARCH_LIMIT,
      });
      const cacheKey = await buildCacheKey(resource, {
        limitCount,
        searchTerm,
      });
      const cached = await readCache<{ items: unknown[] }>(cacheKey);

      if (cached?.items && Array.isArray(cached.items)) {
        return jsonResponse(200, {
          items: cached.items,
          ok: true,
          resource,
        });
      }

      const items = await searchProfiles(admin, {
        limitCount,
        searchTerm,
      });
      await writeCache(cacheKey, { items });

      return jsonResponse(200, {
        items,
        ok: true,
        resource,
      });
    }

    const rawUserId = normalizeValue(payload.userId);
    const rawUsername = buildUsernameCandidate(payload.username);
    const viewerId = normalizeValue(payload.viewerId) || null;

    if (!rawUserId && !rawUsername) {
      throw new Error('userId or username is required');
    }

    const cacheKey = await buildCacheKey(resource, {
      userId: rawUserId || null,
      username: rawUsername || null,
      viewerId,
    });
    const cached = await readCache<{ profile: unknown | null; userId: string | null }>(cacheKey);

    if (cached) {
      return jsonResponse(200, {
        ok: true,
        profile: cached.profile,
        resource,
        userId: cached.userId,
      });
    }

    const resolvedUserId = rawUserId || (rawUsername ? await resolveUserIdByUsername(admin, rawUsername) : null);

    if (!resolvedUserId) {
      return jsonResponse(200, {
        ok: true,
        profile: null,
        resource,
        userId: null,
      });
    }

    const profile = await loadProfile(admin, {
      userId: resolvedUserId,
      viewerId,
    });

    await writeCache(cacheKey, {
      profile,
      userId: resolvedUserId,
    });

    return jsonResponse(200, {
      ok: true,
      profile,
      resource,
      userId: resolvedUserId,
    });
  } catch (error) {
    const status = mapErrorToStatus(error);
    const message = normalizeValue((error as Error)?.message) || 'account-read failed';

    if (status === 405) {
      return errorResponse(405, 'Method not allowed');
    }

    return errorResponse(status, message);
  }
});
