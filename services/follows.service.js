'use client'

import {
  doc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore'

import {
  getUserFollowersCollection,
  getUserFollowingCollection,
} from './firestore-media.service'

export async function followUser(followerId, followingId) {
  if (!followerId || !followingId) throw new Error('Invalid user IDs')
  if (followerId === followingId) throw new Error('You cannot follow yourself')

  const followingRef = doc(getUserFollowingCollection(followerId), followingId)
  const followerRef = doc(getUserFollowersCollection(followingId), followerId)

  await runTransaction(followingRef.firestore, async (transaction) => {
    transaction.set(followingRef, {
      createdAt: serverTimestamp(),
      userId: followingId,
    })
    transaction.set(followerRef, {
      createdAt: serverTimestamp(),
      userId: followerId,
    })
  })
}

export async function unfollowUser(followerId, followingId) {
  const followingRef = doc(getUserFollowingCollection(followerId), followingId)
  const followerRef = doc(getUserFollowersCollection(followingId), followerId)

  await runTransaction(followingRef.firestore, async (transaction) => {
    transaction.delete(followingRef)
    transaction.delete(followerRef)
  })
}

export function subscribeToFollowStatus(followerId, followingId, callback) {
  if (!followerId || !followingId) {
    callback(false)
    return () => {}
  }
  const followingRef = doc(getUserFollowingCollection(followerId), followingId)
  return onSnapshot(followingRef, (snapshot) => {
    callback(snapshot.exists())
  })
}

export function subscribeToFollowers(userId, callback) {
  return onSnapshot(getUserFollowersCollection(userId), (snapshot) => {
    const followers = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
    callback(followers)
  })
}

export function subscribeToFollowing(userId, callback) {
  return onSnapshot(getUserFollowingCollection(userId), (snapshot) => {
    const following = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
    callback(following)
  })
}
