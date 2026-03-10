'use client'

import {
  deleteDoc,
  getDoc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore'

import { isValidUrl } from '@/lib/utils'

import {
  getUserDocRef,
  getUsernameDocRef,
} from './firestore-media.service'

const USERNAME_MIN_LENGTH = 3
const USERNAME_MAX_LENGTH = 24
const USERNAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

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

function cleanString(value) {
  if (value === undefined || value === null) return ''
  return String(value).trim()
}

function normalizeOptionalUrl(value) {
  const normalized = cleanString(value)

  if (!normalized) return null
  if (!isValidUrl(normalized)) {
    throw new Error('Image URLs must start with http:// or https://')
  }

  return normalized
}

function buildUsernameCandidate(value) {
  return cleanString(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
}

function createUserIdentity(user = {}) {
  return {
    avatarUrl: user.avatarUrl || user.photoURL || null,
    displayName: user.displayName || user.name || user.email || 'Anonymous User',
    email: user.email || null,
    id: user.id || user.uid || null,
  }
}

function normalizeProfileData(data = {}, id = null) {
  return {
    avatarUrl: data.avatarUrl || null,
    bannerUrl: data.bannerUrl || null,
    createdAt: normalizeTimestamp(data.createdAt),
    description: data.description || '',
    displayName: data.displayName || data.name || 'Anonymous User',
    email: data.email || null,
    id: id || data.id || null,
    updatedAt: normalizeTimestamp(data.updatedAt),
    username: data.username || null,
    usernameLower:
      data.usernameLower || (data.username ? String(data.username).toLowerCase() : null),
  }
}

function buildAvailableUsername(base, attempt = 0) {
  if (attempt === 0) {
    return base
  }

  const suffix = String(attempt + 1)
  const maxBaseLength = USERNAME_MAX_LENGTH - suffix.length - 1
  const trimmedBase = base.slice(0, Math.max(USERNAME_MIN_LENGTH, maxBaseLength))

  return `${trimmedBase}-${suffix}`
}

function getDefaultUsernameBase(user = {}) {
  const identity = createUserIdentity(user)

  const base =
    buildUsernameCandidate(identity.displayName) ||
    buildUsernameCandidate(identity.email?.split('@')[0]) ||
    buildUsernameCandidate(identity.id?.slice(0, 12)) ||
    'tvizzie-user'

  return base.slice(0, USERNAME_MAX_LENGTH)
}

export function sanitizeUsername(value) {
  return buildUsernameCandidate(value)
}

export function validateUsername(value) {
  const username = sanitizeUsername(value)

  if (
    username.length < USERNAME_MIN_LENGTH ||
    username.length > USERNAME_MAX_LENGTH
  ) {
    throw new Error(
      `Username must be ${USERNAME_MIN_LENGTH}-${USERNAME_MAX_LENGTH} characters long`
    )
  }

  if (!USERNAME_PATTERN.test(username)) {
    throw new Error(
      'Username can only contain lowercase letters, numbers, and hyphens'
    )
  }

  return username
}

export function normalizeProfileSnapshot(snapshot) {
  return normalizeProfileData(snapshot.data(), snapshot.id)
}

export async function getUserProfile(userId) {
  const snapshot = await getDoc(getUserDocRef(userId))

  if (!snapshot.exists()) {
    return null
  }

  return normalizeProfileSnapshot(snapshot)
}

export async function getUserIdByUsername(username) {
  const normalizedUsername = validateUsername(username)
  const snapshot = await getDoc(getUsernameDocRef(normalizedUsername))

  if (!snapshot.exists()) {
    return null
  }

  return snapshot.data()?.userId || null
}

export async function getUserProfileByUsername(username) {
  const userId = await getUserIdByUsername(username)

  if (!userId) {
    return null
  }

  return getUserProfile(userId)
}

export function subscribeToUserProfile(userId, callback, options = {}) {
  const { onError } = options

  return onSnapshot(
    getUserDocRef(userId),
    (snapshot) => {
      callback(snapshot.exists() ? normalizeProfileSnapshot(snapshot) : null)
    },
    (error) => {
      if (typeof onError === 'function') {
        onError(error)
      } else {
        console.error('[Profile] Failed to subscribe to user profile:', error)
      }
    }
  )
}

async function tryClaimUsernameForProfile({ user, username, preserveExisting = false }) {
  const identity = createUserIdentity(user)

  if (!identity.id) {
    throw new Error('Authenticated user is required to manage profiles')
  }

  const userRef = getUserDocRef(identity.id)
  const usernameRef = getUsernameDocRef(username)

  const result = await runTransaction(userRef.firestore, async (transaction) => {
    const profileSnapshot = await transaction.get(userRef)
    const usernameSnapshot = await transaction.get(usernameRef)
    const existingProfile = profileSnapshot.exists() ? profileSnapshot.data() || {} : null

    if (
      usernameSnapshot.exists() &&
      usernameSnapshot.data()?.userId &&
      usernameSnapshot.data()?.userId !== identity.id
    ) {
      throw new Error('USERNAME_TAKEN')
    }

    const nextProfile = {
      ...(existingProfile || {}),
      ...(preserveExisting
        ? {
            avatarUrl: existingProfile?.avatarUrl || identity.avatarUrl || null,
            displayName:
              existingProfile?.displayName ||
              identity.displayName ||
              'Anonymous User',
          }
        : {
            avatarUrl: identity.avatarUrl || existingProfile?.avatarUrl || null,
            displayName:
              identity.displayName ||
              existingProfile?.displayName ||
              'Anonymous User',
          }),
      bannerUrl: existingProfile?.bannerUrl || null,
      description: existingProfile?.description || '',
      email: identity.email || existingProfile?.email || null,
      updatedAt: serverTimestamp(),
      username,
      usernameLower: username,
    }

    if (!existingProfile?.createdAt) {
      nextProfile.createdAt = serverTimestamp()
    }

    transaction.set(userRef, nextProfile, { merge: true })
    transaction.set(
      usernameRef,
      {
        updatedAt: serverTimestamp(),
        userId: identity.id,
        usernameLower: username,
      },
      { merge: true }
    )

    return true
  })

  return result
}

export async function ensureUserProfile(user = {}) {
  const identity = createUserIdentity(user)

  if (!identity.id) {
    throw new Error('Authenticated user is required to bootstrap a profile')
  }

  const existingProfile = await getUserProfile(identity.id)

  if (existingProfile?.username) {
    const usernameSnapshot = await getDoc(getUsernameDocRef(existingProfile.username))

    if (!usernameSnapshot.exists()) {
      await setDoc(
        getUsernameDocRef(existingProfile.username),
        {
          updatedAt: serverTimestamp(),
          userId: identity.id,
          usernameLower: existingProfile.usernameLower || existingProfile.username,
        },
        { merge: true }
      )
    }

    if (!existingProfile.displayName || !existingProfile.avatarUrl) {
      await setDoc(
        getUserDocRef(identity.id),
        {
          avatarUrl: existingProfile.avatarUrl || identity.avatarUrl || null,
          displayName: existingProfile.displayName || identity.displayName,
          email: existingProfile.email || identity.email || null,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      )
    }

    return getUserProfile(identity.id)
  }

  const baseUsername = validateUsername(getDefaultUsernameBase(identity))

  for (let attempt = 0; attempt < 50; attempt += 1) {
    const candidate = buildAvailableUsername(baseUsername, attempt)

    try {
      await tryClaimUsernameForProfile({
        preserveExisting: true,
        user: identity,
        username: candidate,
      })

      return getUserProfile(identity.id)
    } catch (error) {
      if (error?.message === 'USERNAME_TAKEN') {
        continue
      }

      throw error
    }
  }

  throw new Error('Could not generate an available username for this profile')
}

export async function updateUserProfile({ userId, updates = {} }) {
  if (!userId) {
    throw new Error('Authenticated user is required to update the profile')
  }

  const currentProfile = await getUserProfile(userId)

  if (!currentProfile) {
    throw new Error('Profile does not exist yet. Please sign in again.')
  }

  const nextUsername =
    updates.username !== undefined
      ? validateUsername(updates.username)
      : currentProfile.username

  const patch = {
    avatarUrl:
      updates.avatarUrl !== undefined
        ? normalizeOptionalUrl(updates.avatarUrl)
        : currentProfile.avatarUrl,
    bannerUrl:
      updates.bannerUrl !== undefined
        ? normalizeOptionalUrl(updates.bannerUrl)
        : currentProfile.bannerUrl,
    description:
      updates.description !== undefined ? cleanString(updates.description) : currentProfile.description,
    displayName:
      updates.displayName !== undefined
        ? cleanString(updates.displayName) || 'Anonymous User'
        : currentProfile.displayName,
    email: currentProfile.email || null,
    updatedAt: serverTimestamp(),
    username: nextUsername,
    usernameLower: nextUsername,
  }

  await runTransaction(getUserDocRef(userId).firestore, async (transaction) => {
    const userRef = getUserDocRef(userId)
    const userSnapshot = await transaction.get(userRef)

    if (!userSnapshot.exists()) {
      throw new Error('Profile not found')
    }

    const previousProfile = userSnapshot.data() || {}
    const previousUsername = previousProfile.username

    if (nextUsername !== previousUsername) {
      const nextUsernameRef = getUsernameDocRef(nextUsername)
      const nextUsernameSnapshot = await transaction.get(nextUsernameRef)

      if (
        nextUsernameSnapshot.exists() &&
        nextUsernameSnapshot.data()?.userId &&
        nextUsernameSnapshot.data()?.userId !== userId
      ) {
        throw new Error('This username is already taken.')
      }

      transaction.set(
        nextUsernameRef,
        {
          updatedAt: serverTimestamp(),
          userId,
          usernameLower: nextUsername,
        },
        { merge: true }
      )

      if (previousUsername && previousUsername !== nextUsername) {
        transaction.delete(getUsernameDocRef(previousUsername))
      }
    }

    transaction.set(
      userRef,
      {
        ...patch,
        createdAt: previousProfile.createdAt || serverTimestamp(),
      },
      { merge: true }
    )
  })

  return getUserProfile(userId)
}

export async function deleteUsernameMapping(username) {
  if (!username) return
  await deleteDoc(getUsernameDocRef(username))
}
