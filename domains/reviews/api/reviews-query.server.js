'use server';

import { readReviews } from '@/domains/reviews/server/read-reviews.server';

export async function getReviewsServer({
  resource,
  listId,
  ownerId,
  entityId,
  entityType,
  limitCount,
}) {
  try {
    const result = await readReviews({
      entityId,
      entityType,
      limitCount,
      listId,
      ownerId,
      resource,
    });
    return { success: true, ...result };
  } catch (error) {
    return { success: false, error: error.message || 'Reviews could not be loaded' };
  }
}
