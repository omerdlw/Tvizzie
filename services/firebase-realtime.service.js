import { get, onValue, ref } from 'firebase/database'

import { database } from './firebase.service'

function getDatabaseInstance() {
  if (!database) {
    throw new Error(
      'Firebase Realtime Database is not configured. Set NEXT_PUBLIC_FIREBASE_DATABASE_URL before using realtime services'
    )
  }

  return database
}

export function subscribeToPath(path, callback) {
  const dbRef = ref(getDatabaseInstance(), path)

  const unsubscribe = onValue(
    dbRef,
    (snapshot) => {
      const data = snapshot.val()
      callback(data, null)
    },
    (error) => {
      console.error(`[Firebase] Error subscribing to ${path}:`, error)
      callback(null, error)
    }
  )

  return unsubscribe
}

export async function getData(path) {
  try {
    const dbRef = ref(getDatabaseInstance(), path)
    const snapshot = await get(dbRef)
    return snapshot.val()
  } catch (error) {
    console.error(`[Firebase] Error getting data from ${path}:`, error)
    throw error
  }
}

export function subscribeWithTransform(path, transform, callback) {
  return subscribeToPath(path, (data, error) => {
    if (error) {
      callback(null, error)
      return
    }

    try {
      const transformed = transform(data)
      callback(transformed, null)
    } catch (transformError) {
      console.error(`[Firebase] Transform error for ${path}:`, transformError)
      callback(null, transformError)
    }
  })
}
