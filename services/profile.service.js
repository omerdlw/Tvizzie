'use client'

import {
  endAt,
  deleteDoc,
  getDoc,
  getDocs,
  limit as limitTo,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  startAt,
} from 'firebase/firestore'

import { isValidUrl } from '@/lib/utils'

import {
  getUserDocRef,
  getUsernameDocRef,
  getUsersCollection,
} from './firestore-media.service'
import { cleanString, normalizeTimestamp } from './firestore-utils'

const USERNAME_MIN_LENGTH = 3
const USERNAME_MAX_LENGTH = 24
const USERNAME_PATTERN = /^[a-z0-9]+(?:[_-][a-z0-9]+)*$/

function normalizeOptionalUrl(value) {
  const normalized = cleanString(value)

  if (!normalized) return null
  if (!isValidUrl(normalized)) {
    throw new Error('Image URLs must start with http:// or https://')
  }

  return normalized
}

function buildUsernameCandidate(value) {
  const turkishMap = {
    ç: 'c',
    ğ: 'g',
    ı: 'i',
    ö: 'o',
    ş: 's',
    ü: 'u',
  }

  const normalized = cleanString(value)
    .toLowerCase()
    .replace(/[çğışüö]/g, (char) => turkishMap[char] || char)

  return normalized
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_{2,}/g, '_')
}

function createUserIdentity(user = {}) {
  return {
    avatarUrl: user.avatarUrl || user.photoURL || null,
    displayName:
      user.displayName || user.name || user.email || 'Anonymous User',
    email: user.email || null,
    id: user.id || user.uid || null,
  }
}

function normalizeDisplayNameSearchValue(value) {
  return cleanString(value).toLocaleLowerCase()
}

function normalizeProfileData(data = {}, id = null) {
  const displayName = data.displayName || data.name || 'Anonymous User'

  return {
    avatarUrl: data.avatarUrl || null,
    bannerUrl: data.bannerUrl || null,
    createdAt: normalizeTimestamp(data.createdAt),
    description: data.description || '',
    displayName,
    displayNameLower:
      data.displayNameLower || normalizeDisplayNameSearchValue(displayName),
    email: data.email || null,
    id: id || data.id || null,
    updatedAt: normalizeTimestamp(data.updatedAt),
    username: data.username || null,
    usernameLower:
      data.usernameLower ||
      (data.username ? String(data.username).toLowerCase() : null),
  }
}

function buildAvailableUsername(base, attempt = 0) {
  if (attempt === 0) {
    return base
  }

  const suffix = String(attempt + 1)
  const maxBaseLength = USERNAME_MAX_LENGTH - suffix.length - 1
  const trimmedBase = base.slice(
    0,
    Math.max(USERNAME_MIN_LENGTH, maxBaseLength)
  )

  return `${trimmedBase}_${suffix}`
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

function buildProfileSearchScore(
  profile,
  rawSearchTerm,
  normalizedUsername,
  normalizedDisplayName
) {
  const username = profile?.usernameLower || ''
  const displayName = profile?.displayName || ''
  const displayNameLower =
    profile?.displayNameLower || normalizeDisplayNameSearchValue(displayName)

  let score = 0

  if (normalizedUsername) {
    if (username === normalizedUsername) {
      score += 120
    } else if (username.startsWith(normalizedUsername)) {
      score += 90
    }
  }

  if (displayNameLower === normalizedDisplayName) {
    score += 110
  } else if (displayNameLower.startsWith(normalizedDisplayName)) {
    score += 70
  } else if (displayName.startsWith(rawSearchTerm)) {
    score += 50
  }

  return score
}

async function runProfileSearch(field, value, limitCount) {
  if (!value) {
    return []
  }

  const snapshot = await getDocs(
    query(
      getUsersCollection(),
      orderBy(field),
      startAt(value),
      endAt(`${value}\uf8ff`),
      limitTo(limitCount)
    )
  )

  return snapshot.docs.map(normalizeProfileSnapshot)
}

export async function searchUserProfiles(searchTerm, options = {}) {
  const rawSearchTerm = cleanString(searchTerm)

  if (!rawSearchTerm) {
    return []
  }

  const limitCount = Math.min(Math.max(Number(options.limitCount) || 6, 1), 10)
  const normalizedUsername = sanitizeUsername(rawSearchTerm)
  const normalizedDisplayName =
    normalizeDisplayNameSearchValue(rawSearchTerm)

  const resultSets = await Promise.allSettled([
    normalizedUsername
      ? runProfileSearch('usernameLower', normalizedUsername, limitCount)
      : Promise.resolve([]),
    runProfileSearch('displayNameLower', normalizedDisplayName, limitCount),
    runProfileSearch('displayName', rawSearchTerm, limitCount),
  ])

  const mergedProfiles = new Map()

  resultSets.forEach((result) => {
    if (result.status !== 'fulfilled') {
      return
    }

    result.value.forEach((profile) => {
      if (!profile?.id) {
        return
      }

      mergedProfiles.set(profile.id, profile)
    })
  })

  return Array.from(mergedProfiles.values())
    .filter((profile) => {
      const username = profile?.usernameLower || ''
      const displayName =
        profile?.displayNameLower ||
        normalizeDisplayNameSearchValue(profile?.displayName)

      return (
        (normalizedUsername && username.startsWith(normalizedUsername)) ||
        displayName.startsWith(normalizedDisplayName)
      )
    })
    .sort((left, right) => {
      const scoreDiff =
        buildProfileSearchScore(
          right,
          rawSearchTerm,
          normalizedUsername,
          normalizedDisplayName
        ) -
        buildProfileSearchScore(
          left,
          rawSearchTerm,
          normalizedUsername,
          normalizedDisplayName
        )

      if (scoreDiff !== 0) {
        return scoreDiff
      }

      return (left.displayName || '').localeCompare(right.displayName || '')
    })
    .slice(0, limitCount)
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

async function tryClaimUsernameForProfile({
  displayName: requestedDisplayName = null,
  failIfProfileHasUsername = false,
  user,
  username,
  preserveExisting = false,
}) {
  const identity = createUserIdentity(user)

  if (!identity.id) {
    throw new Error('Authenticated user is required to manage profiles')
  }

  const userRef = getUserDocRef(identity.id)
  const usernameRef = getUsernameDocRef(username)

  const result = await runTransaction(
    userRef.firestore,
    async (transaction) => {
      const profileSnapshot = await transaction.get(userRef)
      const usernameSnapshot = await transaction.get(usernameRef)
      const existingProfile = profileSnapshot.exists()
        ? profileSnapshot.data() || {}
        : null
      const normalizedDisplayName = cleanString(requestedDisplayName)
      const nextDisplayName = preserveExisting
        ? existingProfile?.displayName ||
          normalizedDisplayName ||
          identity.displayName ||
          'Anonymous User'
        : normalizedDisplayName ||
          identity.displayName ||
          existingProfile?.displayName ||
          'Anonymous User'

      if (
        failIfProfileHasUsername &&
        existingProfile?.username &&
        existingProfile.username !== username
      ) {
        throw new Error('PROFILE_USERNAME_EXISTS')
      }

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
              avatarUrl:
                existingProfile?.avatarUrl || identity.avatarUrl || null,
            }
          : {
              avatarUrl:
                identity.avatarUrl || existingProfile?.avatarUrl || null,
            }),
        bannerUrl: existingProfile?.bannerUrl || null,
        description: existingProfile?.description || '',
        displayName: nextDisplayName,
        displayNameLower: normalizeDisplayNameSearchValue(nextDisplayName),
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

      if (
        !preserveExisting &&
        existingProfile?.username &&
        existingProfile.username !== username
      ) {
        transaction.delete(getUsernameDocRef(existingProfile.username))
      }

      return true
    }
  )

  return result
}

export async function ensureUserProfile(user = {}, options = {}) {
  const identity = createUserIdentity(user)
  const preferredDisplayName = cleanString(options.displayName)
  const preferredUsername = options.username
    ? validateUsername(options.username)
    : null

  if (!identity.id) {
    throw new Error('Authenticated user is required to bootstrap a profile')
  }

  const existingProfile = await getUserProfile(identity.id)

  if (preferredUsername) {
    await tryClaimUsernameForProfile({
      displayName:
        preferredDisplayName ||
        existingProfile?.displayName ||
        identity.displayName,
      preserveExisting: false,
      user: identity,
      username: preferredUsername,
    })

    return getUserProfile(identity.id)
  }

  if (existingProfile?.username) {
    const usernameSnapshot = await getDoc(
      getUsernameDocRef(existingProfile.username)
    )

    if (!usernameSnapshot.exists()) {
      await setDoc(
        getUsernameDocRef(existingProfile.username),
        {
          updatedAt: serverTimestamp(),
          userId: identity.id,
          usernameLower:
            existingProfile.usernameLower || existingProfile.username,
        },
        { merge: true }
      )
    }

    if (
      !existingProfile.displayName ||
      !existingProfile.avatarUrl ||
      !existingProfile.displayNameLower
    ) {
      await setDoc(
        getUserDocRef(identity.id),
        {
          avatarUrl: existingProfile.avatarUrl || identity.avatarUrl || null,
          displayName: existingProfile.displayName || identity.displayName,
          displayNameLower: normalizeDisplayNameSearchValue(
            existingProfile.displayName || identity.displayName
          ),
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
        displayName: preferredDisplayName || identity.displayName,
        failIfProfileHasUsername: true,
        preserveExisting: true,
        user: identity,
        username: candidate,
      })

      return getUserProfile(identity.id)
    } catch (error) {
      if (error?.message === 'USERNAME_TAKEN') {
        continue
      }

      if (error?.message === 'PROFILE_USERNAME_EXISTS') {
        return getUserProfile(identity.id)
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
    throw new Error('Profile does not exist yet. Please sign in again')
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
      updates.description !== undefined
        ? cleanString(updates.description)
        : currentProfile.description,
    displayName:
      updates.displayName !== undefined
        ? cleanString(updates.displayName) || 'Anonymous User'
        : currentProfile.displayName,
    displayNameLower: normalizeDisplayNameSearchValue(
      updates.displayName !== undefined
        ? cleanString(updates.displayName) || 'Anonymous User'
        : currentProfile.displayName
    ),
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
        throw new Error('This username is already taken')
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
