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

/**
 * Follows Service
 * Manages following/followers relationships in Firestore.
 */
export class FollowsService {
    /**
     * Follows a user
     * @param {string} followerId - ID of the user who is following
     * @param {string} followingId - ID of the user being followed
     */
    static async followUser(followerId, followingId) {
        if (!followerId || !followingId) throw new Error('Invalid user IDs')
        if (followerId === followingId) throw new Error('You cannot follow yourself.')

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

    /**
     * Unfollows a user
     * @param {string} followerId - ID of the user who is unfollowing
     * @param {string} followingId - ID of the user being unfollowed
     */
    static async unfollowUser(followerId, followingId) {
        const followingRef = doc(getUserFollowingCollection(followerId), followingId)
        const followerRef = doc(getUserFollowersCollection(followingId), followerId)

        await runTransaction(followingRef.firestore, async (transaction) => {
            transaction.delete(followingRef)
            transaction.delete(followerRef)
        })
    }

    /**
     * Checks if a user is following another user
     * @param {string} followerId 
     * @param {string} followingId 
     * @param {Function} callback 
     */
    static subscribeToFollowStatus(followerId, followingId, callback) {
        if (!followerId || !followingId) {
            callback(false)
            return () => { }
        }
        const followingRef = doc(getUserFollowingCollection(followerId), followingId)
        return onSnapshot(followingRef, (snapshot) => {
            callback(snapshot.exists())
        })
    }

    /**
     * Subscribes to followers count
     * @param {string} userId 
     * @param {Function} callback 
     */
    static subscribeToFollowers(userId, callback) {
        return onSnapshot(getUserFollowersCollection(userId), (snapshot) => {
            const followers = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
            callback(followers)
        })
    }

    /**
     * Subscribes to following count
     * @param {string} userId 
     * @param {Function} callback 
     */
    static subscribeToFollowing(userId, callback) {
        return onSnapshot(getUserFollowingCollection(userId), (snapshot) => {
            const following = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
            callback(following)
        })
    }
}
