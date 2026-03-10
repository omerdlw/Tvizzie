'use client'

import { doc, orderBy, query } from 'firebase/firestore'

import {
  buildMediaItemKey,
  createMediaSnapshot,
  getUserWatchlistCollection,
} from './firestore-media.service'
import {
  subscribeToUserMediaCollection,
  subscribeToUserMediaStatus,
  toggleUserMediaDoc,
} from './user-media.service'

function getWatchlistDocRef(userId, media) {
  if (!userId) {
    throw new Error('Authenticated user is required to manage watchlist items')
  }

  const mediaSnapshot = createMediaSnapshot(media)
  const mediaKey = buildMediaItemKey(
    mediaSnapshot.entityType,
    mediaSnapshot.entityId
  )

  return doc(getUserWatchlistCollection(userId), mediaKey)
}

export function subscribeToWatchlistStatus(
  { media, userId },
  callback,
  options = {}
) {
  return subscribeToUserMediaStatus(
    getWatchlistDocRef(userId, media),
    callback,
    options
  )
}

export function subscribeToUserWatchlist(userId, callback, options = {}) {
  const watchlistQuery = query(
    getUserWatchlistCollection(userId),
    orderBy('addedAt', 'desc')
  )

  return subscribeToUserMediaCollection(watchlistQuery, callback, options)
}

export async function toggleUserWatchlistItem({ media, userId }) {
  const result = await toggleUserMediaDoc(getWatchlistDocRef(userId, media), media)

  return {
    item: result.media || null,
    isInWatchlist: result.isActive,
    mediaKey: result.mediaKey,
  }
}
