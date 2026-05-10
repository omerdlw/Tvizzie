import 'server-only';

import { createAdminClient } from '@/core/clients/supabase/admin';
import {
  canViewerAccessUserContent,
  createPrivateProfileError,
} from '@/core/services/account/account-profile.server';
import { LIST_REVIEW_SELECT } from './reviews.server.constants';
import { fetchReviewLikes, loadListSubjectMap } from './reviews.server.context';
import { createListReviewLikeKey, normalizeReviewRow, sortReviewsByUpdatedAtDesc } from './reviews.server.shared';

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
    rows.map((row) => normalizeReviewRow(row, subject, likesMap.get(`${subject.subjectKey}:${row.user_id}`) || []))
  );
}
