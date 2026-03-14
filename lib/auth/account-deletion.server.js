import { FieldValue } from 'firebase-admin/firestore'

import { getFirebaseAdminFirestore } from '@/lib/auth/firebase-admin.server'

const BATCH_SIZE = 250

function normalizeValue(value) {
  return String(value || '').trim()
}

async function deleteDocsFromQuery(queryRef) {
  while (true) {
    const snapshot = await queryRef.limit(BATCH_SIZE).get()

    if (snapshot.empty) {
      return
    }

    const batch = snapshot.docs[0].ref.firestore.batch()

    snapshot.docs.forEach((docSnapshot) => {
      batch.delete(docSnapshot.ref)
    })

    await batch.commit()
  }
}

function chunkItems(items, size = BATCH_SIZE) {
  const chunks = []

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size))
  }

  return chunks
}

async function getAllMediaItemRefs(db) {
  return db.collection('media_items').listDocuments()
}

async function removeUserCommentDocsFromMediaItems(mediaItemRefs, userId) {
  const mediaRefChunks = chunkItems(mediaItemRefs)

  for (const mediaRefs of mediaRefChunks) {
    if (mediaRefs.length === 0) {
      continue
    }

    const batch = mediaRefs[0].firestore.batch()

    mediaRefs.forEach((mediaRef) => {
      batch.delete(mediaRef.collection('comments').doc(userId))
    })

    await batch.commit()
  }
}

async function removeUserLikesFromMediaItemComments(mediaRef, userId) {
  const commentsRef = mediaRef.collection('comments')

  while (true) {
    const snapshot = await commentsRef
      .where('likes', 'array-contains', userId)
      .limit(BATCH_SIZE)
      .get()

    if (snapshot.empty) {
      return
    }

    const batch = mediaRef.firestore.batch()

    snapshot.docs.forEach((docSnapshot) => {
      batch.update(docSnapshot.ref, {
        likes: FieldValue.arrayRemove(userId),
      })
    })

    await batch.commit()
  }
}

async function removeUserLikesFromMediaItems(mediaItemRefs, userId) {
  for (const mediaRef of mediaItemRefs) {
    await removeUserLikesFromMediaItemComments(mediaRef, userId)
  }
}

async function removeFollowEdges(db, userId) {
  const userRef = db.collection('users').doc(userId)
  const followingRef = userRef.collection('following')
  const followersRef = userRef.collection('followers')

  while (true) {
    const snapshot = await followingRef.limit(BATCH_SIZE).get()

    if (snapshot.empty) {
      break
    }

    const batch = db.batch()

    snapshot.docs.forEach((docSnapshot) => {
      const targetUserId = normalizeValue(docSnapshot.id || docSnapshot.data()?.userId)

      batch.delete(docSnapshot.ref)

      if (targetUserId) {
        batch.delete(
          db.collection('users')
            .doc(targetUserId)
            .collection('followers')
            .doc(userId)
        )
      }
    })

    await batch.commit()
  }

  while (true) {
    const snapshot = await followersRef.limit(BATCH_SIZE).get()

    if (snapshot.empty) {
      break
    }

    const batch = db.batch()

    snapshot.docs.forEach((docSnapshot) => {
      const sourceUserId = normalizeValue(docSnapshot.id || docSnapshot.data()?.userId)

      batch.delete(docSnapshot.ref)

      if (sourceUserId) {
        batch.delete(
          db.collection('users')
            .doc(sourceUserId)
            .collection('following')
            .doc(userId)
        )
      }
    })

    await batch.commit()
  }
}

async function removeUserLists(db, userId) {
  const listsRef = db.collection('users').doc(userId).collection('lists')

  while (true) {
    const listSnapshot = await listsRef.limit(BATCH_SIZE).get()

    if (listSnapshot.empty) {
      return
    }

    for (const listDoc of listSnapshot.docs) {
      await deleteDocsFromQuery(listDoc.ref.collection('items'))
      await listDoc.ref.delete()
    }
  }
}

function hasPasswordProvider(userRecord) {
  return (userRecord?.providerData || [])
    .map((provider) => normalizeValue(provider?.providerId))
    .includes('password')
}

export async function purgeAccountData({ userId }) {
  const normalizedUserId = normalizeValue(userId)

  if (!normalizedUserId) {
    throw new Error('Authenticated user is required')
  }

  const db = getFirebaseAdminFirestore()
  const userRef = db.collection('users').doc(normalizedUserId)
  const userSnapshot = await userRef.get()
  const username = normalizeValue(userSnapshot.data()?.username).toLowerCase()
  const mediaItemRefs = await getAllMediaItemRefs(db)

  await removeUserLikesFromMediaItems(mediaItemRefs, normalizedUserId)
  await removeUserCommentDocsFromMediaItems(mediaItemRefs, normalizedUserId)

  await removeFollowEdges(db, normalizedUserId)
  await deleteDocsFromQuery(userRef.collection('favorites'))
  await deleteDocsFromQuery(userRef.collection('watchlist'))
  await removeUserLists(db, normalizedUserId)
  await userRef.delete().catch(() => null)

  if (username) {
    const usernameRef = db.collection('usernames').doc(username)
    const usernameSnapshot = await usernameRef.get().catch(() => null)

    if (!usernameSnapshot?.exists || usernameSnapshot.data()?.userId === normalizedUserId) {
      await usernameRef.delete().catch(() => null)
    }
  }
}

export function assertPasswordProviderLinked(userRecord) {
  if (!hasPasswordProvider(userRecord)) {
    throw new Error('This account does not have email/password sign-in enabled')
  }
}
