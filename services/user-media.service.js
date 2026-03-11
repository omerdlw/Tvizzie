'use client'

import {
  deleteDoc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore'

import {
  buildMediaItemKey,
  createMediaSnapshot,
} from './firestore-media.service'

export function normalizeTimestamp(value) {
  if (!value) return null

  if (typeof value?.toDate === 'function') {
    return value.toDate().toISOString()
  }

  const parsedDate = new Date(value)

  if (Number.isNaN(parsedDate.getTime())) {
    return null
  }

  return parsedDate.toISOString()
}

export function normalizeUserMediaSnapshot(snapshot) {
  const data = snapshot.data() || {}
  const normalizedEntityId = String(
    data.entityId ||
      data.id ||
      data.mediaKey?.split('_').slice(1).join('_') ||
      snapshot.id
  ).trim()
  const normalizedMediaType = data.media_type || data.entityType || null

  return {
    addedAt: normalizeTimestamp(data.addedAt),
    backdrop_path: data.backdrop_path || data.backdropPath || null,
    entityId: normalizedEntityId || null,
    entityType: normalizedMediaType,
    first_air_date: data.first_air_date || null,
    id: normalizedEntityId || snapshot.id,
    mediaKey: data.mediaKey || snapshot.id,
    media_type: normalizedMediaType,
    name: data.name || data.original_name || '',
    original_name: data.original_name || null,
    original_title: data.original_title || null,
    poster_path: data.poster_path || data.posterPath || null,
    release_date: data.release_date || null,
    title: data.title || data.original_title || '',
    updatedAt: normalizeTimestamp(data.updatedAt),
    vote_average: Number.isFinite(Number(data.vote_average))
      ? Number(data.vote_average)
      : null,
    position: Number.isFinite(Number(data.position))
      ? Number(data.position)
      : null,
  }
}

export function createUserMediaPayload(media = {}) {
  const mediaSnapshot = createMediaSnapshot(media)

  if (
    !mediaSnapshot.entityType ||
    !mediaSnapshot.entityId ||
    !mediaSnapshot.title
  ) {
    throw new Error('User media entries require entityType, entityId and title')
  }

  const mediaKey = buildMediaItemKey(
    mediaSnapshot.entityType,
    mediaSnapshot.entityId
  )
  const voteAverage = Number(media.vote_average)
  const isMovie = mediaSnapshot.entityType === 'movie'

  return {
    addedAt: serverTimestamp(),
    backdropPath: mediaSnapshot.backdropPath,
    backdrop_path: mediaSnapshot.backdropPath,
    entityId: mediaSnapshot.entityId,
    entityType: mediaSnapshot.entityType,
    first_air_date: isMovie ? null : media.first_air_date || null,
    mediaKey,
    media_type: mediaSnapshot.entityType,
    name: isMovie
      ? ''
      : media.name || media.original_name || mediaSnapshot.title,
    original_name: media.original_name || null,
    original_title: media.original_title || null,
    posterPath: mediaSnapshot.posterPath,
    poster_path: mediaSnapshot.posterPath,
    release_date: isMovie ? media.release_date || null : null,
    title: isMovie
      ? media.title || media.original_title || mediaSnapshot.title
      : '',
    position: media.position || Date.now(),
    updatedAt: serverTimestamp(),
    vote_average: Number.isFinite(voteAverage) ? voteAverage : null,
  }
}

export async function updateUserMediaPosition(docRef, position) {
  if (!docRef || position === undefined) {
    throw new Error('updateUserMediaPosition requires a docRef and position')
  }

  await setDoc(
    docRef,
    { position, updatedAt: serverTimestamp() },
    { merge: true }
  )

  return { position }
}

export function subscribeToUserMediaStatus(docRef, callback, options = {}) {
  const { onError } = options

  return onSnapshot(
    docRef,
    (snapshot) => {
      callback(
        snapshot.exists(),
        snapshot.exists() ? normalizeUserMediaSnapshot(snapshot) : null
      )
    },
    (error) => {
      if (typeof onError === 'function') {
        onError(error)
      } else {
        console.error('[UserMedia] Failed to subscribe to item status:', error)
      }
    }
  )
}

export function subscribeToUserMediaCollection(
  itemsQuery,
  callback,
  options = {}
) {
  const { onError } = options

  return onSnapshot(
    itemsQuery,
    (snapshot) => {
      callback(snapshot.docs.map(normalizeUserMediaSnapshot))
    },
    (error) => {
      if (typeof onError === 'function') {
        onError(error)
      } else {
        console.error('[UserMedia] Failed to subscribe to collection:', error)
      }
    }
  )
}

export async function setUserMediaDoc(docRef, media) {
  const payload = createUserMediaPayload(media)

  await setDoc(docRef, payload, { merge: true })

  return {
    media: {
      ...payload,
      addedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    mediaKey: payload.mediaKey,
  }
}

export async function toggleUserMediaDoc(docRef, media) {
  const existingDoc = await getDoc(docRef)

  if (existingDoc.exists()) {
    await deleteDoc(docRef)

    return {
      isActive: false,
      mediaKey: existingDoc.id,
    }
  }

  const payload = await setUserMediaDoc(docRef, media)

  return {
    ...payload,
    isActive: true,
  }
}
