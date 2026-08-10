'use server';

import { getAccountIdByUsername, getAccountProfileByUserId } from '../profile.server';
import { getViewerSessionContext } from '../routes.server';
export async function getAccountProfileServer({ userId, username }) {
  try {
    let targetUserId = userId || null;
    if (!targetUserId && username) {
      targetUserId = await getAccountIdByUsername(username);
    }
    const sessionContext = await getViewerSessionContext().catch(() => null);
    const authenticatedViewerId = sessionContext?.userId || null;
    if (!targetUserId && authenticatedViewerId) targetUserId = authenticatedViewerId;

    if (!targetUserId) {
      return { success: true, profile: null };
    }

    const profile = await getAccountProfileByUserId(targetUserId, {
      viewerId: authenticatedViewerId,
    });
    return { success: true, profile: profile || null };
  } catch (error) {
    return { success: false, error: error.message || 'Profile could not be loaded' };
  }
}
