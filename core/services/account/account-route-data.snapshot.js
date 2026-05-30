import 'server-only';

import { getEditableAccountSnapshotByUserId } from '@/core/services/account/account.server';
import { getAccountIdByUsername, getAccountProfileByUserId } from '@/core/services/account/account-profile.server';
import { getViewerSessionContext } from './account-route-data.session';

export async function getCurrentEditableAccountSnapshot() {
  const sessionContext = await getViewerSessionContext();

  if (!sessionContext?.userId) {
    return null;
  }

  return getEditableAccountSnapshotByUserId(sessionContext.userId);
}

export async function getUsernameAccountSnapshot(username) {
  const sessionContext = await getViewerSessionContext();
  const viewerId = sessionContext?.userId || null;
  const resolvedUserId = await getAccountIdByUsername(username);

  if (!resolvedUserId) {
    return {
      initialCounts: null,
      initialProfile: null,
      initialResolveError: 'Account not found',
      initialResolvedUserId: null,
      viewerId,
    };
  }

  const profile = await getAccountProfileByUserId(resolvedUserId, { viewerId });

  return {
    initialCounts: {
      likes: Number(profile?.likesCount || 0),
      lists: Number(profile?.listsCount || 0),
      watched: Number(profile?.watchedCount || 0),
      watchlist: Number(profile?.watchlistCount || 0),
    },
    initialProfile: profile,
    initialResolveError: profile ? null : 'Account not found',
    initialResolvedUserId: profile ? resolvedUserId : null,
    viewerId,
  };
}
