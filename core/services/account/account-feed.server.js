import 'server-only';

import { createAdminClient } from '@/core/clients/supabase/admin';
import { ACTIVITY_EVENT_TYPE_SET } from '@/core/services/activity/activity-events.constants';
import { canViewerAccessUserContent, createPrivateProfileError } from '@/core/services/account/account-profile.server';
import { ACTIVITY_SELECT, FOLLOW_STATUS_ACCEPTED } from './account-feed.constants';
import { fetchDerivedUserActivityItems } from './account-feed.derived';
import {
  chunkArray,
  dedupeActivityItems,
  filterActivityItemsBySubject,
  isVisibleActivityItem,
  normalizeActivityRow,
  normalizeActivitySort,
  normalizeActivitySubjectFilter,
  normalizeValue,
  paginateItems,
  sortActivityItems,
  sortActivityItemsForMode,
} from './account-feed.normalizers';
import { projectActivityItem } from './account-feed.projector';

async function fetchActivitiesForSources(admin, sourceIds = [], pageSize = null) {
  const uniqueSourceIds = [...new Set(sourceIds.map((value) => normalizeValue(value)).filter(Boolean))];

  if (!uniqueSourceIds.length) {
    return [];
  }

  const perSourceLimit = Number.isFinite(Number(pageSize)) && Number(pageSize) > 0 ? Number(pageSize) : null;
  const groups = await Promise.all(
    chunkArray(uniqueSourceIds, 100).map(async (idChunk) => {
      let queryBuilder = admin
        .from('activity')
        .select(ACTIVITY_SELECT)
        .in('event_type', [...ACTIVITY_EVENT_TYPE_SET])
        .in('user_id', idChunk)
        .order('updated_at', { ascending: false });

      if (perSourceLimit) {
        queryBuilder = queryBuilder.limit(idChunk.length * perSourceLimit);
      }

      const result = await queryBuilder;

      if (result.error) {
        throw new Error(result.error.message || 'Activity feed could not be loaded');
      }

      return (result.data || []).map(normalizeActivityRow).filter(isVisibleActivityItem);
    })
  );

  const countsBySource = new Map();
  const normalizedItems = sortActivityItems(groups.flat()).filter((item) => {
    if (!perSourceLimit) {
      return true;
    }

    const sourceUserId = normalizeValue(item?.sourceUserId);

    if (!sourceUserId) {
      return false;
    }

    const currentCount = countsBySource.get(sourceUserId) || 0;

    if (currentCount >= perSourceLimit) {
      return false;
    }

    countsBySource.set(sourceUserId, currentCount + 1);
    return true;
  });

  return normalizedItems;
}

async function fetchAcceptedFollowingIds(admin, userId) {
  const result = await admin
    .from('follows')
    .select('following_id')
    .eq('follower_id', userId)
    .eq('status', FOLLOW_STATUS_ACCEPTED);

  if (result.error) {
    throw new Error(result.error.message || 'Following list could not be loaded');
  }

  return (result.data || []).map((item) => item.following_id).filter(Boolean);
}

export async function fetchAccountActivityFeedServer({
  cursor = null,
  pageSize = 20,
  scope = 'user',
  sort = 'newest',
  subject = 'all',
  userId,
  viewerId = null,
}) {
  if (!userId) {
    return {
      hasMore: false,
      items: [],
      nextCursor: null,
    };
  }

  const admin = createAdminClient();
  const canViewProfile = await canViewerAccessUserContent({
    client: admin,
    ownerId: userId,
    viewerId,
  });

  if (!canViewProfile) {
    throw createPrivateProfileError();
  }

  const followingIds = await fetchAcceptedFollowingIds(admin, userId).catch(() => []);
  const sourceIds = scope === 'following' ? [...new Set(followingIds)] : [userId];
  const normalizedPageSize = Number.isFinite(Number(pageSize)) ? Math.max(1, Math.floor(Number(pageSize))) : 20;
  const normalizedOffset = Number.isFinite(Number(cursor)) ? Math.max(0, Math.floor(Number(cursor))) : 0;
  const normalizedSubject = normalizeActivitySubjectFilter(subject);
  const normalizedSort = normalizeActivitySort(sort);
  const shouldResolveFullFilteredSet = normalizedSubject !== 'all' || normalizedSort !== 'newest';
  const sourcePageSize = shouldResolveFullFilteredSet ? null : Math.max(normalizedOffset + normalizedPageSize * 2, 24);

  if (sourceIds.length === 0) {
    return {
      hasMore: false,
      items: [],
      nextCursor: null,
    };
  }

  const rawActivityItems = (await fetchActivitiesForSources(admin, sourceIds, sourcePageSize)).map((item) => ({
    ...item,
    isFromFollowing: normalizeValue(item?.sourceUserId) !== normalizeValue(userId),
  }));
  const derivedUserActivityItems =
    rawActivityItems.length === 0 && scope === 'user'
      ? (
          await fetchDerivedUserActivityItems({
            offset: normalizedOffset,
            pageSize: normalizedPageSize,
            userId,
            viewerId,
          })
        ).map((item) => ({
          ...item,
          isFromFollowing: false,
        }))
      : [];
  const items = sortActivityItemsForMode(
    filterActivityItemsBySubject(
      dedupeActivityItems(rawActivityItems.length > 0 ? rawActivityItems : derivedUserActivityItems),
      normalizedSubject
    ),
    normalizedSort
  );

  const paginated = paginateItems(items, cursor, pageSize);

  return {
    ...paginated,
    items: paginated.items.map((item) => projectActivityItem(item, viewerId)),
    totalCount: items.length,
  };
}
