'use client'

import { doc, orderBy, query } from 'firebase/firestore'

import {
  buildMediaItemKey,
  createMediaSnapshot,
  getUserFavoritesCollection,
} from './firestore-media.service'
import {
  subscribeToUserMediaCollection,
  subscribeToUserMediaStatus,
  toggleUserMediaDoc,
} from './user-media.service'

export function getFavoriteDocRef(userId, media) {
  if (!userId) {
    throw new Error('Authenticated user is required to manage favorites')
  }

  const mediaSnapshot = createMediaSnapshot(media)
  const mediaKey = buildMediaItemKey(
    mediaSnapshot.entityType,
    mediaSnapshot.entityId
  )

  return doc(getUserFavoritesCollection(userId), mediaKey)
}

export function subscribeToFavoriteStatus(
  { media, userId },
  callback,
  options = {}
) {
  const favoriteRef = getFavoriteDocRef(userId, media)

  return subscribeToUserMediaStatus(favoriteRef, callback, options)
}

export function subscribeToUserFavorites(userId, callback, options = {}) {
  const favoritesQuery = query(
    getUserFavoritesCollection(userId),
    orderBy('addedAt', 'desc')
  )

  return subscribeToUserMediaCollection(favoritesQuery, callback, options)
}

export async function toggleUserFavorite({ media, userId }) {
  const favoriteRef = getFavoriteDocRef(userId, media)
  const result = await toggleUserMediaDoc(favoriteRef, media)

  return {
    favorite: result.media || null,
    isFavorite: result.isActive,
    mediaKey: result.mediaKey,
  }
}
