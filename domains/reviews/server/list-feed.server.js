import 'server-only';

import { createAdminClient } from '@/infrastructure/supabase/admin';
import {
  canViewerAccessUserContent,
  createPrivateProfileError,
} from '@/domains/account/server/profile.server';
import { LIST_REVIEW_SELECT } from '@/domains/reviews/shared/review-utils';
import { fetchReviewLikes, loadListSubjectMap } from './review-context.server.js';
import {
  createListReviewLikeKey,
  normalizeReviewRow,
  sortReviewsByUpdatedAtDesc,
} from './review-normalizer.server.js';

export async function fetchListReviewFeedServer({ listId, ownerId, viewerId = null }) {
  if (!ownerId || !listId) {
    return [];
  }

  const admin = createAdminClient();
  const canViewProfile = await canViewerAccessUserContent({
    client: admin,
    ownerId,
    viewerId,
  });

  if (!canViewProfile) {
    throw createPrivateProfileError();
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
    rows.map((row) =>
      normalizeReviewRow(row, subject, likesMap.get(`${subject.subjectKey}:${row.user_id}`) || []),
    ),
  );
}
