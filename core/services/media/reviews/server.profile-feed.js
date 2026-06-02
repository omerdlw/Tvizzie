import 'server-only';

import { createAdminClient } from '@/core/clients/supabase/admin';
import { canViewerAccessUserContent, createPrivateProfileError } from '@/core/services/account/account-profile.server';
import { LIST_REVIEW_SELECT, MEDIA_REVIEW_SELECT, REVIEW_LIKE_SELECT } from './server.constants.js';
import { fetchReviewLikes, loadListSubjectMap } from './server.context.js';
import {
  createListReviewLikeKey,
  dedupeReviews,
  isSupportedReviewItem,
  normalizeReviewRow,
  paginateReviewItems,
  parseListReviewLikeKey,
  resolveReviewWindow,
  sortReviewsByUpdatedAtDesc,
} from './server.shared.js';

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

export async function fetchProfileReviewFeedLegacyServer({
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
    client: admin,
    ownerId: userId,
    viewerId,
  });

  if (!canViewProfile) {
    throw createPrivateProfileError();
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
