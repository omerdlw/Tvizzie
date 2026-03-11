'use client'

import {
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  writeBatch,
} from 'firebase/firestore'

import {
  buildMediaItemKey,
  createMediaSnapshot,
  getUserListDocRef,
  getUserListItemsCollection,
  getUserListsCollection,
} from './firestore-media.service'
import { cleanString } from './firestore-utils'
import {
  createUserMediaPayload,
  normalizeTimestamp,
  normalizeUserMediaSnapshot,
} from './user-media.service'

function slugifyListTitle(value) {
  return cleanString(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
}

function normalizeListSnapshot(snapshot) {
  const data = snapshot.data() || {}

  return {
    createdAt: normalizeTimestamp(data.createdAt),
    description: data.description || '',
    coverUrl: data.coverUrl || '',
    id: snapshot.id,
    itemsCount: Number.isFinite(Number(data.itemsCount))
      ? Number(data.itemsCount)
      : 0,
    slug: data.slug || snapshot.id,
    title: data.title || 'Untitled List',
    updatedAt: normalizeTimestamp(data.updatedAt),
  }
}

function validateListTitle(value) {
  const title = cleanString(value)

  if (title.length < 2) {
    throw new Error('List title must be at least 2 characters long')
  }

  return title.slice(0, 80)
}

function validateListDescription(value) {
  return cleanString(value).slice(0, 280)
}

function getListItemDocRef(userId, listId, media) {
  const mediaSnapshot = createMediaSnapshot(media)
  const mediaKey = buildMediaItemKey(
    mediaSnapshot.entityType,
    mediaSnapshot.entityId
  )

  return doc(getUserListItemsCollection(userId, listId), mediaKey)
}

export function subscribeToUserLists(userId, callback, options = {}) {
  const { onError } = options
  const listsQuery = query(
    getUserListsCollection(userId),
    orderBy('updatedAt', 'desc')
  )

  return onSnapshot(
    listsQuery,
    (snapshot) => {
      callback(snapshot.docs.map(normalizeListSnapshot))
    },
    (error) => {
      if (typeof onError === 'function') {
        onError(error)
      } else {
        console.error('[Lists] Failed to subscribe to user lists:', error)
      }
    }
  )
}

export function subscribeToUserListItems(
  userId,
  listId,
  callback,
  options = {}
) {
  const { onError } = options
  const itemsQuery = query(
    getUserListItemsCollection(userId, listId),
    orderBy('addedAt', 'desc')
  )

  return onSnapshot(
    itemsQuery,
    (snapshot) => {
      callback(snapshot.docs.map(normalizeUserMediaSnapshot))
    },
    (error) => {
      if (typeof onError === 'function') {
        onError(error)
      } else {
        console.error('[Lists] Failed to subscribe to list items:', error)
      }
    }
  )
}

export async function createUserList({ userId, title, description = '' }) {
  if (!userId) {
    throw new Error('Authenticated user is required to create a list')
  }

  const validatedTitle = validateListTitle(title)
  const validatedDescription = validateListDescription(description)
  const listRef = doc(getUserListsCollection(userId))
  const slugBase = slugifyListTitle(validatedTitle) || 'list'
  const slug = `${slugBase}-${listRef.id.slice(0, 6)}`

  await setDoc(listRef, {
    createdAt: serverTimestamp(),
    description: validatedDescription,
    coverUrl: cleanString(arguments[0].coverUrl),
    itemsCount: 0,
    slug,
    title: validatedTitle,
    updatedAt: serverTimestamp(),
  })

  return {
    createdAt: new Date().toISOString(),
    description: validatedDescription,
    id: listRef.id,
    itemsCount: 0,
    slug,
    title: validatedTitle,
    updatedAt: new Date().toISOString(),
  }
}

export async function updateUserList({
  userId,
  listId,
  title,
  description = '',
  coverUrl = '',
}) {
  if (!userId || !listId) {
    throw new Error(
      'Authenticated user and listId are required to update a list'
    )
  }

  const validatedTitle = validateListTitle(title)
  const validatedDescription = validateListDescription(description)
  const listRef = getUserListDocRef(userId, listId)
  const listSnapshot = await getDoc(listRef)

  if (!listSnapshot.exists()) {
    throw new Error('List not found')
  }

  const existingData = listSnapshot.data() || {}

  await setDoc(
    listRef,
    {
      description: validatedDescription,
      coverUrl: cleanString(coverUrl),
      slug:
        existingData.slug ||
        `${slugifyListTitle(validatedTitle) || 'list'}-${listId.slice(0, 6)}`,
      title: validatedTitle,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  )

  return {
    ...normalizeListSnapshot(listSnapshot),
    description: validatedDescription,
    title: validatedTitle,
    updatedAt: new Date().toISOString(),
  }
}

export async function deleteUserList({ userId, listId }) {
  if (!userId || !listId) {
    throw new Error(
      'Authenticated user and listId are required to delete a list'
    )
  }

  const itemsSnapshot = await getDocs(
    getUserListItemsCollection(userId, listId)
  )
  const batch = writeBatch(getUserListDocRef(userId, listId).firestore)

  itemsSnapshot.forEach((itemDoc) => {
    batch.delete(itemDoc.ref)
  })

  batch.delete(getUserListDocRef(userId, listId))
  await batch.commit()

  return true
}

export async function getUserListMemberships({ userId, listIds = [], media }) {
  if (!userId || !media || listIds.length === 0) {
    return {}
  }

  const memberships = await Promise.all(
    listIds.map(async (listId) => {
      const itemSnapshot = await getDoc(
        getListItemDocRef(userId, listId, media)
      )
      return [listId, itemSnapshot.exists()]
    })
  )

  return Object.fromEntries(memberships)
}

export async function toggleUserListItem({ userId, listId, media }) {
  if (!userId || !listId) {
    throw new Error(
      'Authenticated user and listId are required to update list items'
    )
  }

  const listRef = getUserListDocRef(userId, listId)
  const itemRef = getListItemDocRef(userId, listId, media)
  const payload = createUserMediaPayload(media)

  const result = await runTransaction(
    listRef.firestore,
    async (transaction) => {
      const listSnapshot = await transaction.get(listRef)

      if (!listSnapshot.exists()) {
        throw new Error('List not found')
      }

      const itemSnapshot = await transaction.get(itemRef)
      const currentCount = Number(listSnapshot.data()?.itemsCount || 0)

      if (itemSnapshot.exists()) {
        transaction.delete(itemRef)
        transaction.set(
          listRef,
          {
            itemsCount: Math.max(0, currentCount - 1),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        )

        return {
          isInList: false,
          mediaKey: itemSnapshot.id,
        }
      }

      transaction.set(itemRef, payload, { merge: true })
      transaction.set(
        listRef,
        {
          itemsCount: currentCount + 1,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      )

      return {
        isInList: true,
        item: {
          ...payload,
          addedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        mediaKey: payload.mediaKey,
      }
    }
  )

  return result
}
