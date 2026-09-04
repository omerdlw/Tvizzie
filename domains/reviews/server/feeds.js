import 'server-only';

import { createAdminClient } from '@/infrastructure/supabase/server';
import { canViewerAccessUserContent, createPrivateProfileError } from '@/domains/account/server';
import {
  LIST_REVIEW_SELECT,
  MEDIA_REVIEW_SELECT,
  normalizeProfileReviewFeedMode,
  PROFILE_REVIEW_FEED_MODE,
  REVIEW_LIKE_SELECT,
} from '@/domains/reviews/utils/constants';
import {
  createListReviewLikeKey,
  dedupeReviews,
  fetchReviewLikes,
  loadListSubjectMap,
  normalizeReviewRow,
  paginateReviewItems,
  parseListReviewLikeKey,
  resolveReviewWindow,
  sortReviewsByUpdatedAtDesc,
} from './resources.js';

export async function fetchListReviewFeedServer({ listId, ownerId, viewerId = null }) {
  if (!ownerId || !listId) {
    return [];
  }

  const admin = createAdminClient();
  const [canViewProfile, reviewResult] = await Promise.all([
    canViewerAccessUserContent({
      client: admin,
      ownerId,
      viewerId,
    }),
    admin
      .from('list_reviews')
      .select(LIST_REVIEW_SELECT)
      .eq('list_id', listId)
      .order('updated_at', { ascending: false }),
  ]);

  if (!canViewProfile) {
    throw createPrivateProfileError();
  }

  if (reviewResult.error) {
    throw new Error(reviewResult.error.message || 'List reviews could not be loaded');
  }

  const rows = reviewResult.data || [];

  if (rows.length === 0) {
    return [];
  }

  const subjectKey = createListReviewLikeKey(ownerId, listId);
  const userIds = [...new Set(rows.map((r) => r.user_id).filter(Boolean))];

  const [listMap, likesMap, authorProfilesResult] = await Promise.all([
    loadListSubjectMap(admin, [listId]),
    fetchReviewLikes(admin, [subjectKey]),
    userIds.length > 0
      ? admin.from('profiles').select('id,username,display_name,avatar_url').in('id', userIds)
      : Promise.resolve({ data: [] }),
  ]);

  const userMap = new Map();
  (authorProfilesResult.data || []).forEach((p) => {
    userMap.set(p.id, {
      avatarUrl: p.avatar_url || null,
      id: p.id,
      name: p.display_name || p.username || 'Anonymous User',
      username: p.username || null,
    });
  });

  const subject = listMap.get(listId) || {
    subjectHref: null,
    subjectId: listId,
    subjectKey,
    subjectOwnerId: ownerId,
    subjectOwnerUsername: ownerId,
    subjectPreviewItems: [],
    subjectPoster: null,
    subjectSlug: listId,
    subjectTitle: 'Untitled List',
    subjectType: 'list',
  };

  return sortReviewsByUpdatedAtDesc(
    rows.map((row) =>
      normalizeReviewRow(
        row,
        subject,
        likesMap.get(
          `${String(subject.subjectKey || '')
            .trim()
            .toLowerCase()}:${String(row.user_id || '')
            .trim()
            .toLowerCase()}`,
        ) || [],
        userMap.get(row.user_id),
      ),
    ),
  );
}

async function fetchAuthoredReviews(admin, userId, { fetchLimit = null } = {}) {
  let mediaQuery = admin
    .from('media_reviews')
    .select(MEDIA_REVIEW_SELECT)
    .eq('user_id', userId)
    .order('updated_at', {
      ascending: false,
    });
  let listQuery = admin
    .from('list_reviews')
    .select(LIST_REVIEW_SELECT)
    .eq('user_id', userId)
    .order('updated_at', {
      ascending: false,
    });

  if (Number.isFinite(Number(fetchLimit)) && Number(fetchLimit) > 0) {
    const resolvedLimit = Math.max(1, Math.min(Math.floor(Number(fetchLimit)), 300));
    mediaQuery = mediaQuery.limit(resolvedLimit);
    listQuery = listQuery.limit(resolvedLimit);
  }

  const [mediaResult, listResult] = await Promise.all([mediaQuery, listQuery]);

  if (mediaResult.error) {
    throw new Error(mediaResult.error.message || 'Reviews could not be loaded');
  }

  if (listResult.error) {
    throw new Error(listResult.error.message || 'Reviews could not be loaded');
  }

  const mediaRows = mediaResult.data || [];
  const listRows = listResult.data || [];
  const listMap = await loadListSubjectMap(
    admin,
    listRows.map((row) => row.list_id),
  );
  const likeKeys = [
    ...mediaRows.map((row) => row.media_key),
    ...listRows.map((row) => {
      const subject = listMap.get(row.list_id);
      return subject?.subjectKey || null;
    }),
  ].filter(Boolean);
  const likesMap = await fetchReviewLikes(admin, likeKeys);

  const mediaReviews = mediaRows.map((row) =>
    normalizeReviewRow(row, {}, likesMap.get(`${row.media_key}:${row.user_id}`) || []),
  );

  const listReviews = listRows.map((row) => {
    const subject = listMap.get(row.list_id) || {
      subjectHref: null,
      subjectId: row.list_id,
      subjectKey: createListReviewLikeKey('', row.list_id),
      subjectOwnerId: null,
      subjectOwnerUsername: null,
      subjectPreviewItems: [],
      subjectPoster: null,
      subjectSlug: row.list_id,
      subjectTitle: 'Untitled List',
      subjectType: 'list',
    };
    const reviewKey = subject.subjectKey;

    return normalizeReviewRow(
      row,
      subject,
      likesMap.get(
        `${String(reviewKey || '')
          .trim()
          .toLowerCase()}:${String(row.user_id || '')
          .trim()
          .toLowerCase()}`,
      ) || [],
    );
  });

  return sortReviewsByUpdatedAtDesc([...mediaReviews, ...listReviews]);
}

async function fetchLikedReviews(admin, userId, { fetchLimit = null } = {}) {
  let likesQuery = admin
    .from('review_likes')
    .select(REVIEW_LIKE_SELECT)
    .eq('user_id', userId)
    .order('created_at', {
      ascending: false,
    });

  if (Number.isFinite(Number(fetchLimit)) && Number(fetchLimit) > 0) {
    const resolvedLimit = Math.max(1, Math.min(Math.floor(Number(fetchLimit)), 300));
    likesQuery = likesQuery.limit(resolvedLimit);
  }

  const { data: likeRows, error: likesError } = await likesQuery;

  if (likesError) {
    throw new Error(likesError.message || 'Review likes could not be loaded');
  }

  const safeLikeRows = likeRows || [];

  if (safeLikeRows.length === 0) {
    return [];
  }

  const mediaKeys = [];
  const listTargets = [];

  safeLikeRows.forEach((row) => {
    const key = String(row.media_key || '');
    const parsedListKey = parseListReviewLikeKey(key);

    if (parsedListKey) {
      listTargets.push({
        listId: parsedListKey.listId,
        ownerId: parsedListKey.ownerId,
        reviewUserId: row.review_user_id,
      });
      return;
    }

    if (key) {
      mediaKeys.push({
        mediaKey: key,
        reviewUserId: row.review_user_id,
      });
    }
  });

  const uniqueMediaKeys = [...new Set(mediaKeys.map((item) => item.mediaKey))];
  const uniqueListIds = [...new Set(listTargets.map((item) => item.listId))];
  const uniqueTargetUserIds = [
    ...new Set(
      [
        ...mediaKeys.map((item) => item.reviewUserId),
        ...listTargets.map((item) => item.reviewUserId),
      ].filter(Boolean),
    ),
  ];

  const [mediaReviewsResult, listReviewsResult, listMap, likesMap] = await Promise.all([
    uniqueMediaKeys.length > 0 && uniqueTargetUserIds.length > 0
      ? admin
          .from('media_reviews')
          .select(MEDIA_REVIEW_SELECT)
          .in('media_key', uniqueMediaKeys)
          .in('user_id', uniqueTargetUserIds)
      : Promise.resolve({ data: [] }),
    uniqueListIds.length > 0 && uniqueTargetUserIds.length > 0
      ? admin
          .from('list_reviews')
          .select(LIST_REVIEW_SELECT)
          .in('list_id', uniqueListIds)
          .in('user_id', uniqueTargetUserIds)
      : Promise.resolve({ data: [] }),
    loadListSubjectMap(admin, uniqueListIds),
    fetchReviewLikes(admin, [
      ...uniqueMediaKeys,
      ...uniqueListIds.map((listId) => {
        const subject = listMap?.get ? listMap.get(listId) : null;
        return subject?.subjectKey || null;
      }),
    ]),
  ]);

  const authorProfilesResult =
    uniqueTargetUserIds.length > 0
      ? await admin
          .from('profiles')
          .select('id,username,display_name,avatar_url')
          .in('id', uniqueTargetUserIds)
      : { data: [], error: null };

  if (mediaReviewsResult.error) {
    throw new Error(mediaReviewsResult.error.message || 'Media reviews could not be loaded');
  }

  if (listReviewsResult.error) {
    throw new Error(listReviewsResult.error.message || 'List reviews could not be loaded');
  }

  if (authorProfilesResult.error) {
    throw new Error(authorProfilesResult.error.message || 'Review authors could not be loaded');
  }

  const authorProfileMap = new Map(
    (authorProfilesResult.data || []).map((profile) => [
      profile.id,
      {
        avatarUrl: profile.avatar_url || null,
        id: profile.id,
        name: profile.display_name || profile.username || 'Anonymous User',
        username: profile.username || null,
      },
    ]),
  );

  const mediaRowMap = new Map();
  (mediaReviewsResult.data || []).forEach((row) => {
    mediaRowMap.set(`${row.media_key}:${row.user_id}`, row);
  });

  const listRowMap = new Map();
  (listReviewsResult.data || []).forEach((row) => {
    listRowMap.set(`${row.list_id}:${row.user_id}`, row);
  });

  const normalizedReviews = [];

  safeLikeRows.forEach((row) => {
    const key = String(row.media_key || '');
    const parsedListKey = parseListReviewLikeKey(key);

    if (parsedListKey) {
      const listReviewRow = listRowMap.get(`${parsedListKey.listId}:${row.review_user_id}`);

      if (!listReviewRow) {
        return;
      }

      const subject = listMap.get(parsedListKey.listId) || {
        subjectHref: null,
        subjectId: parsedListKey.listId,
        subjectKey: key,
        subjectOwnerId: parsedListKey.ownerId,
        subjectOwnerUsername: parsedListKey.ownerId,
        subjectPreviewItems: [],
        subjectPoster: null,
        subjectSlug: parsedListKey.listId,
        subjectTitle: 'Untitled List',
        subjectType: 'list',
      };

      normalizedReviews.push(
        normalizeReviewRow(
          listReviewRow,
          subject,
          likesMap.get(
            `${String(key || '')
              .trim()
              .toLowerCase()}:${String(listReviewRow.user_id || '')
              .trim()
              .toLowerCase()}`,
          ) || [],
          authorProfileMap.get(listReviewRow.user_id),
        ),
      );
      return;
    }

    const mediaReviewRow = mediaRowMap.get(`${row.media_key}:${row.review_user_id}`);

    if (!mediaReviewRow) {
      return;
    }

    normalizedReviews.push(
      normalizeReviewRow(
        mediaReviewRow,
        {},
        likesMap.get(
          `${String(row.media_key || '')
            .trim()
            .toLowerCase()}:${String(mediaReviewRow.user_id || '')
            .trim()
            .toLowerCase()}`,
        ) || [],
        authorProfileMap.get(mediaReviewRow.user_id),
      ),
    );
  });

  return dedupeReviews(normalizedReviews);
}

export async function fetchProfileReviewFeedLegacyServer({
  cursor = null,
  mode = PROFILE_REVIEW_FEED_MODE.AUTHORED,
  pageSize = 20,
  userId,
  viewerId = null,
}) {
  if (!userId) {
    return paginateReviewItems([], cursor, pageSize);
  }

  const admin = createAdminClient();
  const canAccessProfile = await canViewerAccessUserContent({
    client: admin,
    ownerId: userId,
    viewerId,
  });

  if (!canAccessProfile) {
    throw createPrivateProfileError();
  }

  const { fetchLimit } = resolveReviewWindow({ cursor, pageSize });

  if (normalizeProfileReviewFeedMode(mode) === PROFILE_REVIEW_FEED_MODE.LIKED) {
    const likedReviews = await fetchLikedReviews(admin, userId, { fetchLimit });
    return paginateReviewItems(likedReviews, cursor, pageSize);
  }

  const authoredReviews = await fetchAuthoredReviews(admin, userId, { fetchLimit });
  return paginateReviewItems(authoredReviews, cursor, pageSize);
}

export async function fetchProfileReviewFeedServer({
  cursor = null,
  mode = PROFILE_REVIEW_FEED_MODE.AUTHORED,
  pageSize = 20,
  userId,
  viewerId = null,
}) {
  if (!userId) {
    return paginateReviewItems([], cursor, pageSize);
  }

  try {
    const directResult = await fetchProfileReviewFeedLegacyServer({
      cursor,
      mode,
      pageSize,
      userId,
      viewerId,
    });

    if (Array.isArray(directResult?.items)) {
      return directResult;
    }
  } catch (error) {
    if (Number(error?.status) === 403) throw error;
  }

  return paginateReviewItems([], cursor, pageSize);
}
