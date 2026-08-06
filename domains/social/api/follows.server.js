'use server';

import { getFollowResource } from '../server/social/follow-resources.server';
import { normalizeValue } from '@/shared/utils';

export async function getFollowsServer({ resource, targetId, userId, viewerId, status }) {
  try {
    const data = await getFollowResource({
      resource: normalizeValue(resource),
      status: normalizeValue(status) || null,
      strict: true,
      targetId: normalizeValue(targetId),
      userId: normalizeValue(userId),
      viewerId: normalizeValue(viewerId),
    });
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message || 'Follow resource could not be loaded' };
  }
}
