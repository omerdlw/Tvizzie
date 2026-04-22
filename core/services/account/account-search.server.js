import 'server-only';

import { createAdminClient } from '@/core/clients/supabase/admin';
import { cleanString, normalizeTimestamp } from '@/core/utils';
import {
  normalizeAccountDisplayNameSearchValue,
  sanitizeUsername,
} from '@/core/utils/account';

const ACCOUNT_SEARCH_LIMIT = 10;
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

function assertSearchResult(result, fallbackMessage) {
  if (result?.error) {
    throw new Error(result.error.message || fallbackMessage);
  }

  return result;
}

async function withSearchQueryTimeout(
  promise,
  { timeoutMs = 2500, fallbackValue = { data: [], error: null }, label = 'Account search' } = {}
) {
  const timeoutPromise = new Promise((resolve) =>
    setTimeout(() => resolve({ ...fallbackValue, timedOut: true, label }), timeoutMs)
  );

  const result = await Promise.race([promise, timeoutPromise]);

  if (result?.timedOut) {
    console.warn(`[Supabase ${label} Timeout] After ${timeoutMs}ms. Returning fallback.`);
    return result;
  }

  return result;
}

function normalizeSearchProfile(row = {}) {
  const displayName = row.display_name || 'Anonymous User';

  return {
    avatarUrl: row.avatar_url || null,
    bannerUrl: row.banner_url || null,
    createdAt: normalizeTimestamp(row.created_at),
    description: row.description || '',
    displayName,
    displayNameLower: row.display_name_lower || normalizeAccountDisplayNameSearchValue(displayName),
    id: row.id,
    isPrivate: row.is_private === true,
    updatedAt: normalizeTimestamp(row.updated_at),
    username: row.username || null,
    usernameLower: row.username_lower || null,
  };
}

function matchesAccountSearch(profile, { normalizedDisplayName, normalizedUsername }) {
  const username = profile?.usernameLower || '';
  const displayName = profile?.displayNameLower || normalizeAccountDisplayNameSearchValue(profile?.displayName);

  return (normalizedUsername && username.startsWith(normalizedUsername)) || displayName.startsWith(normalizedDisplayName);
}

function buildAccountSearchScore(profile, rawSearchTerm, normalizedUsername, normalizedDisplayName) {
  const username = profile?.usernameLower || '';
  const displayName = profile?.displayName || '';
  const displayNameLower = profile?.displayNameLower || normalizeAccountDisplayNameSearchValue(displayName);

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
  } else if (displayName.startsWith(rawSearchTerm)) {
    score += 50;
  }

  return score;
}

export async function searchAccountProfiles(searchTerm, limitCount = 6) {
  const rawSearchTerm = cleanString(searchTerm);

  if (!rawSearchTerm) {
    return [];
  }

  const admin = createAdminClient();
  const normalizedUsername = sanitizeUsername(rawSearchTerm);
  const normalizedDisplayName = normalizeAccountDisplayNameSearchValue(rawSearchTerm);
  const resolvedLimitCount = Math.min(Math.max(Number(limitCount) || 6, 1), ACCOUNT_SEARCH_LIMIT);
  const queryPromise = admin
    .from('profiles')
    .select(ACCOUNT_SEARCH_SELECT)
    .or([`username_lower.ilike.${normalizedUsername}%`, `display_name_lower.ilike.${normalizedDisplayName}%`].join(','))
    .limit(resolvedLimitCount * 2);

  const result = await withSearchQueryTimeout(queryPromise, {
    label: `Account search for "${searchTerm}"`,
  });

  if (result?.timedOut) {
    return [];
  }

  assertSearchResult(result, 'Account search failed');

  return (result.data || [])
    .map((row) => normalizeSearchProfile(row))
    .filter((profile) => matchesAccountSearch(profile, { normalizedDisplayName, normalizedUsername }))
    .sort((left, right) => {
      const scoreDiff =
        buildAccountSearchScore(right, rawSearchTerm, normalizedUsername, normalizedDisplayName) -
        buildAccountSearchScore(left, rawSearchTerm, normalizedUsername, normalizedDisplayName);

      if (scoreDiff !== 0) {
        return scoreDiff;
      }

      return (left.displayName || '').localeCompare(right.displayName || '');
    })
    .slice(0, resolvedLimitCount);
}
