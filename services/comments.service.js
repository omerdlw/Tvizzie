'use client'

import {
  arrayRemove,
  arrayUnion,
  deleteDoc,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore'

import {
  buildMediaItemKey,
  createMediaSnapshot,
  getMediaCommentsCollection,
  getMediaItemRef,
} from './firestore-media.service'

const COMMENT_MIN_LENGTH = 10
const COMMENT_LIMIT = 120

function normalizeTimestamp(value) {
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

function normalizeRating(value) {
  if (value === undefined || value === null || value === '') return null

  const parsedValue = Number(value)

  if (!Number.isFinite(parsedValue) || parsedValue < 1 || parsedValue > 10) {
    throw new Error('Rating must be a number between 1 and 10')
  }

  return Math.round(parsedValue)
}

function normalizeCommentSnapshot(snapshot) {
  const data = snapshot.data() || {}
  console.log(data);

  return {
    id: snapshot.id,
    content: data.content || '',
    mediaKey: data.mediaKey || null,
    rating: data.rating ?? null,
    isSpoiler: !!data.isSpoiler,
    likes: Array.isArray(data.likes) ? data.likes : [],
    createdAt: normalizeTimestamp(data.createdAt),
    updatedAt: normalizeTimestamp(data.updatedAt),
    user: {
      avatarUrl: data.user?.avatarUrl || null,
      email: data.user?.email || null,
      id: data.user?.id || snapshot.id,
      name: data.user?.name || 'Anonymous User',
      username: data.user?.username || null,
    },
  }
}

export function getCommentMinLength() {
  return COMMENT_MIN_LENGTH
}

export function subscribeToMediaComments(media, callback, options = {}) {
  const { limitCount = COMMENT_LIMIT, onError } = options
  const commentsQuery = query(
    getMediaCommentsCollection(media),
    orderBy('updatedAt', 'desc'),
    limit(limitCount)
  )

  return onSnapshot(
    commentsQuery,
    (snapshot) => {
      callback(snapshot.docs.map(normalizeCommentSnapshot))
    },
    (error) => {
      if (typeof onError === 'function') {
        onError(error)
      } else {
        console.error(
          '[Comments] Failed to subscribe to media comments:',
          error
        )
      }
    }
  )
}

export async function upsertMediaComment({
  media,
  user,
  rating = null,
  content,
  isSpoiler = false,
}) {
  const mediaSnapshot = createMediaSnapshot(media)
  const normalizedContent = String(content || '').trim()
  const normalizedRating = normalizeRating(rating)

  if (
    !mediaSnapshot.entityType ||
    !mediaSnapshot.entityId ||
    !mediaSnapshot.title
  ) {
    throw new Error('Media comments require entityType, entityId and title')
  }

  if (!user?.id) {
    throw new Error('Authenticated user is required to submit a comment')
  }

  if (normalizedContent.length < COMMENT_MIN_LENGTH) {
    throw new Error(
      `Comment must be at least ${COMMENT_MIN_LENGTH} characters long`
    )
  }

  const mediaKey = buildMediaItemKey(
    mediaSnapshot.entityType,
    mediaSnapshot.entityId
  )
  const mediaRef = getMediaItemRef(mediaSnapshot)
  const commentRef = doc(getMediaCommentsCollection(mediaSnapshot), user.id)
  const existingComment = await getDoc(commentRef)

  await setDoc(
    mediaRef,
    {
      ...mediaSnapshot,
      mediaKey,
      lastCommentedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  )

  await setDoc(
    commentRef,
    {
      content: normalizedContent,
      mediaKey,
      rating: normalizedRating,
      isSpoiler: !!isSpoiler,
      likes: existingComment.exists() ? existingComment.data()?.likes || [] : [],
      createdAt: existingComment.exists()
        ? existingComment.data()?.createdAt || serverTimestamp()
        : serverTimestamp(),
      updatedAt: serverTimestamp(),
      user: {
        avatarUrl: user.avatarUrl || user.photoURL || null,
        email: user.email || null,
        id: user.id,
        name: user.displayName || user.name || user.email || 'Anonymous User',
        username: user.username || null,
      },
    },
    { merge: true }
  )

  return {
    content: normalizedContent,
    mediaKey,
    rating: normalizedRating,
    isSpoiler: !!isSpoiler,
    userId: user.id,
  }
}

export async function deleteMediaComment({ media, userId }) {
  if (!media || !userId) {
    throw new Error('Media object and userId are required to delete a comment')
  }

  const mediaSnapshot = createMediaSnapshot(media)
  const commentRef = doc(getMediaCommentsCollection(mediaSnapshot), userId)

  await deleteDoc(commentRef)

  return true
}

export async function toggleCommentLike({ media, commentUserId, userId }) {
  if (!media || !commentUserId || !userId) {
    throw new Error('Media, commentUserId, and userId are required to toggle a like')
  }

  const mediaSnapshot = createMediaSnapshot(media)
  const commentRef = doc(getMediaCommentsCollection(mediaSnapshot), commentUserId)

  const existingComment = await getDoc(commentRef)
  if (!existingComment.exists()) {
    throw new Error('Comment not found')
  }

  const currentLikes = existingComment.data()?.likes || []
  const hasLiked = currentLikes.includes(userId)

  await setDoc(
    commentRef,
    {
      likes: hasLiked ? arrayRemove(userId) : arrayUnion(userId)
    },
    { merge: true }
  )

  return !hasLiked
}

