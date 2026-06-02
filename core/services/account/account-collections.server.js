import 'server-only';

import { createAdminClient } from '@/core/clients/supabase/admin';
import { canViewerAccessUserContent, createPrivateProfileError } from '@/core/services/account/account-profile.server';
import { normalizeTimestamp } from '@/core/utils/format';
import { isTitleMediaType } from '@/core/utils/media';
import {
  LIST_COLLECTION_SELECT,
  LIST_ITEM_SELECT,
  MEDIA_COLLECTION_SELECT,
  WATCHED_SELECT,
} from './account-collections.constants';
import { normalizeListRow, normalizeMediaPayload, normalizeWatchedRow } from './account-collections.normalizers';
import {
  ACCOUNT_COLLECTION_RESOURCES,
  PROTECTED_ACCOUNT_COLLECTION_RESOURCES,
  assertResult,
  countListLikesByListIds,
  executeCollectionQuery,
  resolveLimitCount,
} from './account-collections.shared.server';
import { resolveAccountCollectionStatusResource } from './account-collections.status.server';

export function isAccountCollectionResource(resource) {
  return ACCOUNT_COLLECTION_RESOURCES.has(resource);
}

export async function getAccountCollectionResource({
  admin,
  assertResult,
  canViewerAccessUserContent,
  createPrivateProfileError,
  executeCollectionQuery,
  limitCount = null,
  listId = null,
  media = null,
  resolveLimitCount,
  resource,
  slug = null,
  strict = false,
  userId,
  viewerId = null,
}) {
  if (PROTECTED_ACCOUNT_COLLECTION_RESOURCES.has(resource)) {
    const canAccess = await canViewerAccessUserContent({
      ownerId: userId,
      viewerId,
    });

    if (!canAccess) {
      throw createPrivateProfileError();
    }
  }

  const statusResource = await resolveAccountCollectionStatusResource({
    admin,
    assertResult,
    media,
    resource,
    userId,
  });

  if (statusResource.handled) {
    return statusResource.data;
  }

  if (resource === 'likes') {
    let query = admin
      .from('likes')
      .select(MEDIA_COLLECTION_SELECT)
      .eq('user_id', userId)
      .order('added_at', { ascending: false });
    const resolvedLimitCount = resolveLimitCount(limitCount, 0, 200);

    if (resolvedLimitCount > 0) {
      query = query.limit(resolvedLimitCount);
    }

    const result = await executeCollectionQuery(query, {
      label: `Likes for user ${userId}`,
      fallbackValue: { data: [], error: null },
      strict,
    });

    if (result?.timedOut) {
      return [];
    }

    assertResult(result, 'Likes could not be loaded');

    return (result.data || [])
      .map((row) => normalizeMediaPayload(row.payload || {}, row))
      .filter((item) => isTitleMediaType(item?.entityType));
  }

  if (resource === 'watchlist') {
    let query = admin
      .from('watchlist')
      .select(MEDIA_COLLECTION_SELECT)
      .eq('user_id', userId)
      .order('added_at', { ascending: false });
    const resolvedLimitCount = resolveLimitCount(limitCount, 0, 200);

    if (resolvedLimitCount > 0) {
      query = query.limit(resolvedLimitCount);
    }

    const result = await executeCollectionQuery(query, {
      label: `Watchlist for user ${userId}`,
      fallbackValue: { data: [], error: null },
      strict,
    });

    if (result?.timedOut) {
      return [];
    }

    assertResult(result, 'Watchlist could not be loaded');

    return (result.data || []).map((row) => normalizeMediaPayload(row.payload || {}, row));
  }

  if (resource === 'lists') {
    let query = admin
      .from('lists')
      .select(LIST_COLLECTION_SELECT)
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });
    const resolvedLimitCount = resolveLimitCount(limitCount, 0, 200);

    if (resolvedLimitCount > 0) {
      query = query.limit(resolvedLimitCount);
    }

    const result = await executeCollectionQuery(query, {
      label: `Lists for user ${userId}`,
      fallbackValue: { data: [], error: null },
      strict,
    });

    if (result?.timedOut) {
      return [];
    }

    assertResult(result, 'Lists could not be loaded');

    const rows = result.data || [];
    const likesMap = await countListLikesByListIds(
      admin,
      assertResult,
      rows.map((row) => row.id)
    );

    return rows.map((row) => normalizeListRow(row, likesMap));
  }

  if (resource === 'list-items') {
    let query = admin
      .from('list_items')
      .select(LIST_ITEM_SELECT)
      .eq('user_id', userId)
      .eq('list_id', listId)
      .order('added_at', { ascending: false });
    const resolvedLimitCount = resolveLimitCount(limitCount, 0, 200);

    if (resolvedLimitCount > 0) {
      query = query.limit(resolvedLimitCount);
    }

    const result = await executeCollectionQuery(query, {
      label: `List items for list ${listId}`,
      fallbackValue: { data: [], error: null },
      strict,
    });

    if (result?.timedOut) {
      return [];
    }

    assertResult(result, 'List items could not be loaded');

    return (result.data || [])
      .map((row) => normalizeMediaPayload(row.payload || {}, row))
      .filter((item) => isTitleMediaType(item?.entityType));
  }

  if (resource === 'list-by-id') {
    const result = await admin
      .from('lists')
      .select(LIST_COLLECTION_SELECT)
      .eq('id', listId)
      .eq('user_id', userId)
      .maybeSingle();

    assertResult(result, 'List could not be loaded');

    if (!result.data) {
      return null;
    }

    const likesMap = await countListLikesByListIds(admin, assertResult, [result.data.id]);
    return normalizeListRow(result.data, likesMap);
  }

  if (resource === 'list-by-slug') {
    const result = await admin
      .from('lists')
      .select(LIST_COLLECTION_SELECT)
      .eq('user_id', userId)
      .eq('slug', slug)
      .maybeSingle();

    assertResult(result, 'List could not be loaded');

    if (!result.data) {
      return null;
    }

    const likesMap = await countListLikesByListIds(admin, assertResult, [result.data.id]);
    return normalizeListRow(result.data, likesMap);
  }

  if (resource === 'liked-lists') {
    let likesQuery = admin
      .from('list_likes')
      .select('list_id,created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    const resolvedLimitCount = resolveLimitCount(limitCount, 0, 200);

    if (resolvedLimitCount > 0) {
      likesQuery = likesQuery.limit(resolvedLimitCount);
    }

    const likesResult = await executeCollectionQuery(likesQuery, {
      label: `Liked lists for user ${userId}`,
      fallbackValue: { data: [], error: null },
      strict,
    });

    if (likesResult?.timedOut) {
      return [];
    }

    assertResult(likesResult, 'Liked lists could not be loaded');

    const likedAtByListId = new Map(
      (likesResult.data || [])
        .map((row) => [row.list_id, normalizeTimestamp(row.created_at)])
        .filter(([listId]) => Boolean(listId))
    );
    const listIds = [...new Set((likesResult.data || []).map((row) => row.list_id))];

    if (listIds.length === 0) {
      return [];
    }

    const listRows = [];

    for (let index = 0; index < listIds.length; index += 100) {
      const ids = listIds.slice(index, index + 100);
      const listResult = await admin.from('lists').select(LIST_COLLECTION_SELECT).in('id', ids);

      assertResult(listResult, 'Liked lists could not be loaded');
      listRows.push(...(listResult.data || []));
    }

    const likesMap = await countListLikesByListIds(
      admin,
      assertResult,
      listRows.map((row) => row.id)
    );

    return listRows
      .map((row) => ({
        ...normalizeListRow(row, likesMap),
        likedAt: likedAtByListId.get(row.id) || null,
      }))
      .sort((left, right) => {
        const leftTime = left?.likedAt ? new Date(left.likedAt).getTime() : 0;
        const rightTime = right?.likedAt ? new Date(right.likedAt).getTime() : 0;

        if (rightTime !== leftTime) {
          return rightTime - leftTime;
        }

        return String(right?.id || '').localeCompare(String(left?.id || ''));
      });
  }

  if (resource === 'watched') {
    let query = admin
      .from('watched')
      .select(WATCHED_SELECT)
      .eq('user_id', userId)
      .order('last_watched_at', { ascending: false });
    const resolvedLimitCount = resolveLimitCount(limitCount, 0, 200);

    if (resolvedLimitCount > 0) {
      query = query.limit(resolvedLimitCount);
    }

    const result = await executeCollectionQuery(query, {
      label: `Watched for user ${userId}`,
      fallbackValue: { data: [], error: null },
      strict,
    });

    if (result?.timedOut) {
      return [];
    }

    assertResult(result, 'Watched list could not be loaded');

    return (result.data || []).map(normalizeWatchedRow).filter((item) => isTitleMediaType(item?.entityType));
  }

  throw new Error('Unsupported account collection resource');
}

export async function getCollectionResource({
  resource,
  userId,
  viewerId = null,
  limitCount = null,
  media = null,
  listId = null,
  slug = null,
  strict = false,
}) {
  if (!isAccountCollectionResource(resource)) {
    throw new Error('Unsupported collection resource');
  }

  const admin = createAdminClient();

  return getAccountCollectionResource({
    admin,
    assertResult,
    canViewerAccessUserContent,
    createPrivateProfileError,
    executeCollectionQuery,
    limitCount,
    listId,
    media,
    resolveLimitCount,
    resource,
    slug,
    strict,
    userId,
    viewerId,
  });
}
