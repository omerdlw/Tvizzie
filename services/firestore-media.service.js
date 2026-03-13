import { collection, doc } from 'firebase/firestore'

import { firestore } from './firebase.service'

const COLLECTIONS = {
  MEDIA_ITEMS: 'media_items',
  COMMENTS: 'comments',
  USERS: 'users',
  FAVORITES: 'favorites',
  WATCHLIST: 'watchlist',
  LISTS: 'lists',
  ITEMS: 'items',
  USERNAMES: 'usernames',
  FOLLOWING: 'following',
  FOLLOWERS: 'followers',
}

function ensureFirestore() {
  if (!firestore) {
    throw new Error(
      'Cloud Firestore is not configured. Check your Firebase environment variables before using media data'
    )
  }

  return firestore
}

export function buildMediaItemKey(entityType, entityId) {
  if (!entityType || entityId === undefined || entityId === null) {
    throw new Error('buildMediaItemKey requires both entityType and entityId')
  }

  return `${String(entityType).trim().toLowerCase()}_${String(entityId).trim()}`
}

export function createMediaSnapshot(media = {}) {
  return {
    entityId: String(media.entityId ?? media.id ?? '').trim(),
    entityType: String(media.entityType ?? media.type ?? '')
      .trim()
      .toLowerCase(),
    title: media.title || media.name || '',
    posterPath: media.posterPath || media.poster_path || null,
    backdropPath: media.backdropPath || media.backdrop_path || null,
  }
}

export function getMediaItemRef(media) {
  const db = ensureFirestore()
  const mediaSnapshot = createMediaSnapshot(media)
  const mediaKey = buildMediaItemKey(
    mediaSnapshot.entityType,
    mediaSnapshot.entityId
  )

  return doc(db, COLLECTIONS.MEDIA_ITEMS, mediaKey)
}

export function getMediaCommentsCollection(media) {
  return collection(getMediaItemRef(media), COLLECTIONS.COMMENTS)
}

export function getUserDocRef(userId) {
  const db = ensureFirestore()

  if (!userId) {
    throw new Error('getUserDocRef requires a valid userId')
  }

  return doc(db, COLLECTIONS.USERS, userId)
}

export function getUsersCollection() {
  const db = ensureFirestore()

  return collection(db, COLLECTIONS.USERS)
}

export function getUserFavoritesCollection(userId) {
  return collection(getUserDocRef(userId), COLLECTIONS.FAVORITES)
}

export function getUserWatchlistCollection(userId) {
  return collection(getUserDocRef(userId), COLLECTIONS.WATCHLIST)
}

export function getUserListsCollection(userId) {
  return collection(getUserDocRef(userId), COLLECTIONS.LISTS)
}

export function getUserListDocRef(userId, listId) {
  if (!listId) {
    throw new Error('getUserListDocRef requires a valid listId')
  }

  return doc(getUserListsCollection(userId), listId)
}

export function getUserListItemsCollection(userId, listId) {
  return collection(getUserListDocRef(userId, listId), COLLECTIONS.ITEMS)
}

export function getUsernameDocRef(username) {
  const db = ensureFirestore()

  if (!username) {
    throw new Error('getUsernameDocRef requires a valid username')
  }

  return doc(db, COLLECTIONS.USERNAMES, String(username).trim().toLowerCase())
}

export function getUserFollowingCollection(userId) {
  return collection(getUserDocRef(userId), COLLECTIONS.FOLLOWING)
}

export function getUserFollowersCollection(userId) {
  return collection(getUserDocRef(userId), COLLECTIONS.FOLLOWERS)
}

export { COLLECTIONS, ensureFirestore }
