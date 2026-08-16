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
        likesMap.get(`${subject.subjectKey}:${row.user_id}`) || [],
        userMap.get(row.user_id),
      ),
    ),
  );
}
