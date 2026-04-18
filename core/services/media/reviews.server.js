import 'server-only';

import { isListSubjectType, isMovieMediaType, isTvReference } from '@/core/utils/media';
import { createAdminClient } from '@/core/clients/supabase/admin';
import { normalizeTimestamp } from '@/core/services/shared/data-utils';
import { invokeInternalEdgeFunction } from '@/core/services/shared/supabase-edge-internal.server';

const ACCOUNT_REVIEWS_FEED_FUNCTION = 'account-reviews-feed';

const MEDIA_REVIEW_SELECT = [
  'content',
  'created_at',
  'is_spoiler',
  'media_key',
  'payload',
  'rating',
  'updated_at',
  'user_id',
].join(',');
const LIST_REVIEW_SELECT = [
  'content',
  'created_at',
  'is_spoiler',
  'list_id',
  'payload',
  'rating',
  'updated_at',
  'user_id',
].join(',');
const REVIEW_LIKE_SELECT = ['created_at', 'media_key', 'review_user_id'].join(',');

function createListReviewLikeKey(ownerId, listId) {
  return `list:${ownerId}:${listId}`;
}

function parseListReviewLikeKey(value) {
  const match = String(value || '').match(/^list:([^:]+):(.+)$/);

  if (!match) {
    return null;
  }

  return {
    listId: match[2],
    ownerId: match[1],
  };
}

function buildReviewDocPath(subject = {}, userId) {
  if (subject.subjectType === 'list') {
    return `users/${subject.subjectOwnerId}/lists/${subject.subjectId}/reviews/${userId}`;
  }

  return `media_items/${subject.subjectKey}/reviews/${userId}`;
}

function normalizeReviewRow(row = {}, subjectOverrides = {}, likes = []) {
  const payload = row.payload && typeof row.payload === 'object' ? row.payload : {};
  const user = payload.user && typeof payload.user === 'object' ? payload.user : {};
  const subject = {
    subjectHref: payload.subjectHref || null,
    subjectId: payload.subjectId || null,
    subjectKey: payload.subjectKey || row.media_key || null,
    subjectOwnerId: payload.subjectOwnerId || null,
    subjectOwnerUsername: payload.subjectOwnerUsername || null,
    subjectPreviewItems: Array.isArray(payload.subjectPreviewItems) ? payload.subjectPreviewItems : [],
    subjectPoster: payload.subjectPoster || null,
    subjectSlug: payload.subjectSlug || null,
    subjectTitle: payload.subjectTitle || payload.title || 'Untitled',
    subjectType: payload.subjectType || null,
    ...subjectOverrides,
  };
  const reviewUserId = row.user_id || payload.authorId || user.id || null;

  return {
    authorId: reviewUserId,
    content: row.content || payload.content || '',
    createdAt: normalizeTimestamp(row.created_at),
    docPath: buildReviewDocPath(subject, reviewUserId),
    id: `${buildReviewDocPath(subject, reviewUserId)}:${reviewUserId}`,
    isSpoiler: Boolean(row.is_spoiler || payload.isSpoiler),
    likes,
    mediaKey: row.media_key || subject.subjectKey || null,
    rating: row.rating === null || row.rating === undefined ? (payload.rating ?? null) : Number(row.rating),
    reviewUserId,
    subjectHref: subject.subjectHref,
    subjectId: subject.subjectId,
    subjectKey: subject.subjectKey,
    subjectOwnerId: subject.subjectOwnerId,
    subjectOwnerUsername: subject.subjectOwnerUsername,
    subjectPreviewItems: subject.subjectPreviewItems,
    subjectPoster: subject.subjectPoster,
    subjectSlug: subject.subjectSlug,
    subjectTitle: subject.subjectTitle,
    subjectType: subject.subjectType,
    updatedAt: normalizeTimestamp(row.updated_at),
    user: {
      avatarUrl: user.avatarUrl || null,
      id: reviewUserId,
      name: user.name || 'Anonymous User',
      username: user.username || null,
    },
  };
}

function buildLikesMap(rows = []) {
  const map = new Map();

  rows.forEach((row) => {
    const key = `${row.media_key}:${row.review_user_id}`;
    const current = map.get(key) || [];

    current.push(row.user_id);
    map.set(key, current);
  });

  return map;
}

async function fetchReviewLikes(admin, mediaKeys = []) {
  if (!Array.isArray(mediaKeys) || mediaKeys.length === 0) {
    return new Map();
  }

  const uniqueKeys = [...new Set(mediaKeys.filter(Boolean))];
  const likesRows = [];

  for (let index = 0; index < uniqueKeys.length; index += 100) {
    const chunk = uniqueKeys.slice(index, index + 100);
    const result = await admin.from('review_likes').select('media_key, review_user_id, user_id').in('media_key', chunk);

    if (result.error) {
      throw new Error(result.error.message || 'Review likes could not be loaded');
    }

    likesRows.push(...(result.data || []));
  }

  return buildLikesMap(likesRows);
}

function getSortableTimestamp(value) {
  if (!value) return 0;

  const parsedTime = new Date(value).getTime();

  return Number.isFinite(parsedTime) ? parsedTime : 0;
}

function sortReviewsByUpdatedAtDesc(items = []) {
  return [...items].sort((left, right) => {
    const updatedDiff = getSortableTimestamp(right?.updatedAt) - getSortableTimestamp(left?.updatedAt);

    if (updatedDiff !== 0) {
      return updatedDiff;
    }

    return String(right?.id || '').localeCompare(String(left?.id || ''));
  });
}

function dedupeReviews(items = []) {
  const seen = new Set();

  return items.filter((item) => {
    const key = String(item?.id || '').trim();

    if (!key || seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function isSupportedReviewItem(item = {}) {
  if (isListSubjectType(item?.subjectType)) {
    return true;
  }

  if (!isMovieMediaType(item?.subjectType)) {
    return false;
  }

  return !isTvReference(item?.subjectHref);
}

function paginateReviewItems(items = [], cursor = null, pageSize = 20) {
  const offset = Number.isFinite(Number(cursor)) ? Number(cursor) : 0;
  const nextItems = items.slice(offset, offset + pageSize);
  const nextOffset = offset + nextItems.length;
  const totalCount = items.length;

  return {
    hasMore: nextOffset < items.length,
    items: nextItems,
    nextCursor: nextOffset < items.length ? nextOffset : null,
    totalCount,
  };
}

function resolveReviewWindow({ cursor = null, pageSize = 20 } = {}) {
  const normalizedPageSize = Number.isFinite(Number(pageSize))
    ? Math.max(1, Math.min(Math.floor(Number(pageSize)), 100))
    : 20;
  const offset = Number.isFinite(Number(cursor)) ? Math.max(0, Math.floor(Number(cursor))) : 0;
  const fetchLimit = Math.min(Math.max(offset + normalizedPageSize * 2, normalizedPageSize * 2), 300);

  return {
    fetchLimit,
    offset,
    pageSize: normalizedPageSize,
  };
}

async function canViewerAccessUserContent({ admin, ownerId, viewerId = null }) {
  if (!ownerId) {
    return false;
  }

  if (viewerId && viewerId === ownerId) {
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

async function loadListSubjectMap(admin, listIds = []) {
  const uniqueListIds = [...new Set(listIds.filter(Boolean))];

  if (uniqueListIds.length === 0) {
    return new Map();
  }

  const listsResult = await admin
    .from('lists')
    .select('id,user_id,slug,title,poster_path,payload')
    .in('id', uniqueListIds);

  if (listsResult.error) {
    throw new Error(listsResult.error.message || 'List context could not be loaded');
  }

  const listRows = listsResult.data || [];
  const ownerIds = [...new Set(listRows.map((row) => row.user_id).filter(Boolean))];
  const ownerMap = new Map();

  if (ownerIds.length > 0) {
    const ownerResult = await admin.from('profiles').select('id,username').in('id', ownerIds);

    if (ownerResult.error) {
      throw new Error(ownerResult.error.message || 'List owners could not be loaded');
    }

    (ownerResult.data || []).forEach((owner) => {
      ownerMap.set(owner.id, owner.username || owner.id);
    });
  }

  const listMap = new Map();

  listRows.forEach((row) => {
    const payload = row.payload && typeof row.payload === 'object' ? row.payload : {};
    const ownerUsername = payload?.ownerSnapshot?.username || ownerMap.get(row.user_id) || row.user_id;
    const slug = row.slug || row.id;

    listMap.set(row.id, {
      subjectHref: `/account/${ownerUsername}/lists/${slug}`,
      subjectId: row.id,
      subjectKey: createListReviewLikeKey(row.user_id, row.id),
      subjectOwnerId: row.user_id,
      subjectOwnerUsername: ownerUsername,
      subjectPreviewItems: Array.isArray(payload.previewItems) ? payload.previewItems : [],
      subjectPoster: row.poster_path || payload.coverUrl || null,
      subjectSlug: slug,
      subjectTitle: row.title || 'Untitled List',
      subjectType: 'list',
    });
  });

  return listMap;
}

async function fetchAuthoredReviews(admin, userId, { fetchLimit = null } = {}) {
  let mediaQuery = admin.from('media_reviews').select(MEDIA_REVIEW_SELECT).eq('user_id', userId).order('updated_at', {
    ascending: false,
  });
  let listQuery = admin.from('list_reviews').select(LIST_REVIEW_SELECT).eq('user_id', userId).order('updated_at', {
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
    listRows.map((row) => row.list_id)
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
    normalizeReviewRow(row, {}, likesMap.get(`${row.media_key}:${row.user_id}`) || [])
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

    return normalizeReviewRow(row, subject, likesMap.get(`${reviewKey}:${row.user_id}`) || []);
  });

  return sortReviewsByUpdatedAtDesc([...mediaReviews, ...listReviews]);
}

async function fetchLikedReviews(admin, userId, { fetchLimit = null } = {}) {
  let likesQuery = admin.from('review_likes').select(REVIEW_LIKE_SELECT).eq('user_id', userId).order('created_at', {
    ascending: false,
  });

  if (Number.isFinite(Number(fetchLimit)) && Number(fetchLimit) > 0) {
    likesQuery = likesQuery.limit(Math.max(1, Math.min(Math.floor(Number(fetchLimit)), 300)));
  }

  const likesResult = await likesQuery;

  if (likesResult.error) {
    throw new Error(likesResult.error.message || 'Liked reviews could not be loaded');
  }

  const likedRows = likesResult.data || [];
  const listLikeRows = [];
  const mediaLikeRows = [];

  likedRows.forEach((row) => {
    if (parseListReviewLikeKey(row.media_key)) {
      listLikeRows.push(row);
      return;
    }

    mediaLikeRows.push(row);
  });

  const listContextIds = listLikeRows.map((row) => parseListReviewLikeKey(row.media_key)?.listId).filter(Boolean);
  const listMap = await loadListSubjectMap(admin, listContextIds);
  const mediaReviewMap = new Map();
  const listReviewMap = new Map();
  const mediaKeys = [...new Set(mediaLikeRows.map((row) => row.media_key).filter(Boolean))];
  const mediaReviewUserIds = [...new Set(mediaLikeRows.map((row) => row.review_user_id).filter(Boolean))];
  const listIds = [
    ...new Set(listLikeRows.map((row) => parseListReviewLikeKey(row.media_key)?.listId).filter(Boolean)),
  ];
  const listReviewUserIds = [...new Set(listLikeRows.map((row) => row.review_user_id).filter(Boolean))];

  for (let index = 0; index < mediaKeys.length; index += 100) {
    const chunk = mediaKeys.slice(index, index + 100);
    let reviewQuery = admin.from('media_reviews').select(MEDIA_REVIEW_SELECT).in('media_key', chunk);

    if (mediaReviewUserIds.length > 0) {
      reviewQuery = reviewQuery.in('user_id', mediaReviewUserIds);
    }

    const reviewResult = await reviewQuery;

    if (reviewResult.error) {
      throw new Error(reviewResult.error.message || 'Liked reviews could not be loaded');
    }

    (reviewResult.data || []).forEach((row) => {
      mediaReviewMap.set(`${row.media_key}:${row.user_id}`, row);
    });
  }

  for (let index = 0; index < listIds.length; index += 100) {
    const chunk = listIds.slice(index, index + 100);
    let reviewQuery = admin.from('list_reviews').select(LIST_REVIEW_SELECT).in('list_id', chunk);

    if (listReviewUserIds.length > 0) {
      reviewQuery = reviewQuery.in('user_id', listReviewUserIds);
    }

    const reviewResult = await reviewQuery;

    if (reviewResult.error) {
      throw new Error(reviewResult.error.message || 'Liked reviews could not be loaded');
    }

    (reviewResult.data || []).forEach((row) => {
      listReviewMap.set(`${row.list_id}:${row.user_id}`, row);
    });
  }

  const likeKeys = [...new Set(likedRows.map((row) => row.media_key).filter(Boolean))];
  const likesMap = await fetchReviewLikes(admin, likeKeys);

  const mediaReviews = mediaLikeRows
    .map((likeRow) => {
      const review = mediaReviewMap.get(`${likeRow.media_key}:${likeRow.review_user_id}`);

      if (!review) {
        return null;
      }

      return normalizeReviewRow(review, {}, likesMap.get(`${likeRow.media_key}:${review.user_id}`) || []);
    })
    .filter(Boolean);

  const listReviews = listLikeRows
    .map((likeRow) => {
      const parsed = parseListReviewLikeKey(likeRow.media_key);

      if (!parsed) {
        return null;
      }

      const review = listReviewMap.get(`${parsed.listId}:${likeRow.review_user_id}`);

      if (!review) {
        return null;
      }

      const subject = listMap.get(parsed.listId) || {
        subjectHref: null,
        subjectId: parsed.listId,
        subjectKey: likeRow.media_key,
        subjectOwnerId: parsed.ownerId,
        subjectOwnerUsername: parsed.ownerId,
        subjectPreviewItems: [],
        subjectPoster: null,
        subjectSlug: parsed.listId,
        subjectTitle: 'Untitled List',
        subjectType: 'list',
      };

      return normalizeReviewRow(review, subject, likesMap.get(`${likeRow.media_key}:${review.user_id}`) || []);
    })
    .filter(Boolean);

  return sortReviewsByUpdatedAtDesc([...mediaReviews, ...listReviews]);
}

async function fetchProfileReviewFeedLegacyServer({
  cursor = null,
  mode = 'authored',
  pageSize = 20,
  userId,
  viewerId = null,
}) {
  if (!userId) {
    return paginateReviewItems([], cursor, pageSize);
  }

  const admin = createAdminClient();
  const canViewProfile = await canViewerAccessUserContent({
    admin,
    ownerId: userId,
    viewerId,
  });

  if (!canViewProfile) {
    const error = new Error('This profile is private');
    error.status = 403;
    throw error;
  }

  const reviewWindow = resolveReviewWindow({
    cursor,
    pageSize,
  });
  const reviews =
    mode === 'liked'
      ? await fetchLikedReviews(admin, userId, {
          fetchLimit: reviewWindow.fetchLimit,
        })
      : await fetchAuthoredReviews(admin, userId, {
          fetchLimit: reviewWindow.fetchLimit,
        });

  return paginateReviewItems(
    dedupeReviews(reviews).filter(isSupportedReviewItem),
    reviewWindow.offset,
    reviewWindow.pageSize
  );
}

export async function fetchProfileReviewFeedServer({
  cursor = null,
  mode = 'authored',
  pageSize = 20,
  userId,
  viewerId = null,
}) {
  if (!userId) {
    return paginateReviewItems([], cursor, pageSize);
  }

  try {
    const result = await invokeInternalEdgeFunction(ACCOUNT_REVIEWS_FEED_FUNCTION, {
      body: {
        cursor,
        mode,
        pageSize,
        userId,
        viewerId,
      },
    });

    return {
      hasMore: result?.hasMore === true,
      items: Array.isArray(result?.items) ? result.items : [],
      nextCursor: result?.nextCursor ?? null,
      totalCount: Number.isFinite(Number(result?.totalCount))
        ? Number(result.totalCount)
        : Array.isArray(result?.items)
          ? result.items.length
          : 0,
    };
  } catch {
    return fetchProfileReviewFeedLegacyServer({
      cursor,
      mode,
      pageSize,
      userId,
      viewerId,
    });
  }
}

export async function fetchListReviewFeedServer({ listId, ownerId, viewerId = null }) {
  if (!ownerId || !listId) {
    return [];
  }

  const admin = createAdminClient();
  const canViewProfile = await canViewerAccessUserContent({
    admin,
    ownerId,
    viewerId,
  });

  if (!canViewProfile) {
    const error = new Error('This profile is private');
    error.status = 403;
    throw error;
  }

  const reviewResult = await admin
    .from('list_reviews')
    .select(LIST_REVIEW_SELECT)
    .eq('list_id', listId)
    .order('updated_at', { ascending: false });

  if (reviewResult.error) {
    throw new Error(reviewResult.error.message || 'List reviews could not be loaded');
  }

  const rows = reviewResult.data || [];

  if (rows.length === 0) {
    return [];
  }

  const listMap = await loadListSubjectMap(admin, [listId]);
  const subject = listMap.get(listId) || {
    subjectHref: null,
    subjectId: listId,
    subjectKey: createListReviewLikeKey(ownerId, listId),
    subjectOwnerId: ownerId,
    subjectOwnerUsername: ownerId,
    subjectPreviewItems: [],
    subjectPoster: null,
    subjectSlug: listId,
    subjectTitle: 'Untitled List',
    subjectType: 'list',
  };
  const likesMap = await fetchReviewLikes(admin, [subject.subjectKey]);

  return sortReviewsByUpdatedAtDesc(
    rows.map((row) => normalizeReviewRow(row, subject, likesMap.get(`${subject.subjectKey}:${row.user_id}`) || []))
  );
}
