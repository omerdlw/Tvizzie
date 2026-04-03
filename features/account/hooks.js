'use client'

import { PROFILE_TABS, getMediaTitle } from './utils'
import { AUTH_ROUTES, buildAuthHref, getCurrentPathWithSearch } from '@/features/auth'
import { logDataError } from '@/core/utils/errors'
import { getUserAvatarUrl } from '@/core/utils'
import {
  useAccountProfile,
  useResolvedAccountUser as useModuleResolvedAccountUser,
} from '@/core/modules/account'
import { useAuthSessionReady } from '@/core/modules/auth'
import { useModal } from '@/core/modules/modal/context'
import { useToast } from '@/core/modules/notification/hooks'
import { FOLLOW_STATUSES, cancelFollowRequest, followUser, subscribeToFollowRelationship, subscribeToFollowers, subscribeToFollowing, unfollowUser } from '@/core/services/social/follows.service'
import {
  ensureLegacyFavoritesBackfilled,
  getLikeDocRef,
  removeUserLike,
  subscribeToUserLikes,
} from '@/core/services/media/likes.service'
import { deleteUserList, subscribeToUserListItems, subscribeToUserLists, toggleUserListItem } from '@/core/services/media/lists.service'
import { getAccountSocialProof } from '@/core/services/media/social-proof.service'
import { updateUserMediaPosition } from '@/core/services/media/user-media.service'
import { subscribeToUserWatched } from '@/core/services/media/watched.service'
import { getWatchlistDocRef, removeUserWatchlistItem, subscribeToUserWatchlist } from '@/core/services/media/watchlist.service'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from 'react'

import {
  filterCollectionItems,
  showAccountErrorToast,
} from './account-hook-utils'

export function useAccountResolvedUser({
  authUserId,
  username,
  initialResolvedUserId = null,
  initialResolveError = null,
}) {
  return useModuleResolvedAccountUser({
    authUserId,
    username,
    initialResolvedUserId,
    initialResolveError,
  })
}

export function useAccountSubscription({ resolvedUserId, initialProfile = null }) {
  const toast = useToast()
  const handleProfileError = useCallback(
    (error) => {
      showAccountErrorToast(toast, error, 'Profile could not be loaded')
    },
    [toast]
  )

  return useAccountProfile({
    resolvedUserId,
    initialProfile,
    onError: handleProfileError,
  })
}

export function useAccountCollections({
  activeTab = null,
  authIsAuthenticated,
  authIsReady,
  canViewPrivateContent,
  initialCollections = null,
  isOwner,
  isPrivateProfile,
  previewLimits = null,
  resolvedUserId,
}) {
  const toast = useToast()
  const likesPreviewLimit = Number(previewLimits?.likes) || 0
  const listsPreviewLimit = Number(previewLimits?.lists) || 0
  const watchedPreviewLimit = Number(previewLimits?.watched) || 0
  const watchlistPreviewLimit = Number(previewLimits?.watchlist) || 0
  const hasInitialCollectionSnapshot =
    initialCollections?.userId &&
    resolvedUserId &&
    initialCollections.userId === resolvedUserId
  const resolveSeedCount = useCallback(
    (key) => {
      if (!hasInitialCollectionSnapshot) {
        return null
      }

      const rawValue = initialCollections?.counts?.[key]

      if (rawValue === null || rawValue === undefined) {
        return null
      }

      return Number(rawValue) || 0
    },
    [hasInitialCollectionSnapshot, initialCollections]
  )
  const hasUsableSeedItems = useCallback(
    (items, key) => {
      if (!hasInitialCollectionSnapshot || !Array.isArray(items)) {
        return false
      }

      if (items.length > 0) {
        return true
      }

      const seededCount = resolveSeedCount(key)

      return seededCount === 0
    },
    [hasInitialCollectionSnapshot, resolveSeedCount]
  )
  const initialLikes = useMemo(
    () =>
      hasInitialCollectionSnapshot && Array.isArray(initialCollections?.likes)
        ? initialCollections.likes
        : [],
    [hasInitialCollectionSnapshot, initialCollections]
  )
  const initialLists = useMemo(
    () =>
      hasInitialCollectionSnapshot && Array.isArray(initialCollections?.lists)
        ? initialCollections.lists
        : [],
    [hasInitialCollectionSnapshot, initialCollections]
  )
  const initialWatchlist = useMemo(
    () =>
      hasInitialCollectionSnapshot && Array.isArray(initialCollections?.watchlist)
        ? initialCollections.watchlist
        : [],
    [hasInitialCollectionSnapshot, initialCollections]
  )
  const initialWatched = useMemo(
    () =>
      hasInitialCollectionSnapshot && Array.isArray(initialCollections?.watched)
        ? initialCollections.watched
        : [],
    [hasInitialCollectionSnapshot, initialCollections]
  )
  const initialCollectionCounts = useMemo(
    () =>
      hasInitialCollectionSnapshot
        ? {
            likes:
              initialCollections?.counts?.likes === null ||
              initialCollections?.counts?.likes === undefined
                ? null
                : Number(initialCollections.counts.likes) || 0,
            lists:
              initialCollections?.counts?.lists === null ||
              initialCollections?.counts?.lists === undefined
                ? null
                : Number(initialCollections.counts.lists) || 0,
            watched:
              initialCollections?.counts?.watched === null ||
              initialCollections?.counts?.watched === undefined
                ? null
                : Number(initialCollections.counts.watched) || 0,
            watchlist:
              initialCollections?.counts?.watchlist === null ||
              initialCollections?.counts?.watchlist === undefined
                ? null
                : Number(initialCollections.counts.watchlist) || 0,
          }
        : {
            likes: null,
            lists: null,
            watched: null,
            watchlist: null,
          },
    [hasInitialCollectionSnapshot, initialCollections]
  )
  const hasSeededLikes = hasUsableSeedItems(initialLikes, 'likes')
  const hasSeededLists = hasUsableSeedItems(initialLists, 'lists')
  const hasSeededWatched = hasUsableSeedItems(initialWatched, 'watched')
  const hasSeededWatchlist = hasUsableSeedItems(initialWatchlist, 'watchlist')
  const shouldForcePrivateRefresh =
    !isOwner &&
    isPrivateProfile === true &&
    canViewPrivateContent
  const shouldUseSeededLikes = hasSeededLikes && !shouldForcePrivateRefresh
  const shouldUseSeededLists = hasSeededLists && !shouldForcePrivateRefresh
  const shouldUseSeededWatched = hasSeededWatched && !shouldForcePrivateRefresh
  const shouldUseSeededWatchlist =
    hasSeededWatchlist && !shouldForcePrivateRefresh
  const [likes, setLikes] = useState(initialLikes)
  const [watched, setWatched] = useState(initialWatched)
  const [watchlist, setWatchlist] = useState(initialWatchlist)
  const [lists, setLists] = useState(initialLists)
  const [collectionCounts, setCollectionCounts] = useState(initialCollectionCounts)
  const [isLoadingCollections, setIsLoadingCollections] = useState(
    !hasInitialCollectionSnapshot
  )

  useEffect(() => {
    const shouldLoadPreviewOnly =
      likesPreviewLimit > 0 ||
      listsPreviewLimit > 0 ||
      watchedPreviewLimit > 0 ||
      watchlistPreviewLimit > 0
    const normalizedActiveTab = String(activeTab || '').trim().toLowerCase()
    // Always scope subscriptions by active account tab to avoid cross-tab cache pollution
    // (e.g. Activity -> Likes showing empty collections due to shared key reuse).
    const shouldScopeCollections = Boolean(normalizedActiveTab)
    const shouldSubscribeLikes =
      !shouldScopeCollections || normalizedActiveTab === 'likes'
    const shouldSubscribeLists =
      !shouldScopeCollections || normalizedActiveTab === 'lists'
    const shouldSubscribeWatched =
      !shouldScopeCollections || normalizedActiveTab === 'watched'
    const shouldSubscribeWatchlist =
      !shouldScopeCollections || normalizedActiveTab === 'watchlist'

    if (!resolvedUserId) {
      setLikes([])
      setWatched([])
      setWatchlist([])
      setLists([])
      setCollectionCounts({
        likes: 0,
        lists: 0,
        watched: 0,
        watchlist: 0,
      })
      setIsLoadingCollections(false)
      return undefined
    }

    if (isOwner && (!authIsReady || !authIsAuthenticated)) {
      if (hasInitialCollectionSnapshot) {
        setLikes(initialLikes)
        setWatched(initialWatched)
        setWatchlist(initialWatchlist)
        setLists(initialLists)
        setCollectionCounts(initialCollectionCounts)
        setIsLoadingCollections(false)
        return undefined
      }

      setLikes([])
      setWatched([])
      setWatchlist([])
      setLists([])
      setCollectionCounts({
        likes: shouldLoadPreviewOnly ? null : 0,
        lists: shouldLoadPreviewOnly ? null : 0,
        watched: shouldLoadPreviewOnly ? null : 0,
        watchlist: shouldLoadPreviewOnly ? null : 0,
      })
      setIsLoadingCollections(true)
      return undefined
    }

    if (!isOwner && isPrivateProfile && !canViewPrivateContent) {
      if (hasInitialCollectionSnapshot) {
        setLikes(initialLikes)
        setWatched(initialWatched)
        setWatchlist(initialWatchlist)
        setLists(initialLists)
        setCollectionCounts(initialCollectionCounts)
        setIsLoadingCollections(false)
        return undefined
      }

      setLikes([])
      setWatched([])
      setWatchlist([])
      setLists([])
      setCollectionCounts({
        likes: 0,
        lists: 0,
        watched: 0,
        watchlist: 0,
      })
      setIsLoadingCollections(false)
      return undefined
    }

    let isMounted = true
    setLikes(initialLikes)
    setWatched(initialWatched)
    setWatchlist(initialWatchlist)
    setLists(initialLists)
    setCollectionCounts(initialCollectionCounts)
    const resolvedOnce = {
      likes: shouldSubscribeLikes ? shouldUseSeededLikes : true,
      lists: shouldSubscribeLists ? shouldUseSeededLists : true,
      watched: shouldSubscribeWatched ? shouldUseSeededWatched : true,
      watchlist: shouldSubscribeWatchlist ? shouldUseSeededWatchlist : true,
    }
    let countsResolved = hasInitialCollectionSnapshot || !shouldLoadPreviewOnly
    const areAllStreamsResolved = () =>
      resolvedOnce.likes &&
      resolvedOnce.watched &&
      resolvedOnce.watchlist &&
      resolvedOnce.lists

    setIsLoadingCollections(
      !hasInitialCollectionSnapshot || !areAllStreamsResolved()
    )

    const resolveLoadingState = () => {
      if (hasInitialCollectionSnapshot) {
        setIsLoadingCollections(!areAllStreamsResolved())
        return
      }

      if (countsResolved && areAllStreamsResolved()) {
        setIsLoadingCollections(false)
      }
    }

    const resolveStream = (key) => {
      if (resolvedOnce[key]) return

      resolvedOnce[key] = true
      resolveLoadingState()
    }

    let unsubscribeLikes = () => {}
    let unsubscribeWatched = () => {}
    let unsubscribeWatchlist = () => {}
    let unsubscribeLists = () => {}

    async function subscribe() {
      if (isOwner) {
        await ensureLegacyFavoritesBackfilled(resolvedUserId)
      }

      if (!isMounted) {
        return
      }

      if (!hasInitialCollectionSnapshot) {
        setCollectionCounts({
          likes: null,
          lists: null,
          watched: null,
          watchlist: null,
        })
      }

      countsResolved = true
      resolveLoadingState()

      if (shouldSubscribeLikes) {
        unsubscribeLikes = subscribeToUserLikes(
          resolvedUserId,
          (nextLikes) => {
            setLikes(nextLikes)
            if (shouldLoadPreviewOnly) {
              setCollectionCounts((current) => ({
                ...current,
                likes: Math.max(current?.likes ?? 0, nextLikes.length),
              }))
            }
            resolveStream('likes')
          },
          {
            activeTab: normalizedActiveTab || null,
            emitCachedPayloadOnSubscribe: !shouldForcePrivateRefresh,
            fetchOnSubscribe: shouldForcePrivateRefresh || !shouldUseSeededLikes,
            refreshOnSubscribe:
              shouldForcePrivateRefresh || normalizedActiveTab === 'likes',
            limitCount: likesPreviewLimit,
            onError: (error) => {
              showAccountErrorToast(toast, error, 'Likes could not be loaded')
              resolveStream('likes')
            },
          }
        )
      }

      if (shouldSubscribeWatched) {
        unsubscribeWatched = subscribeToUserWatched(
          resolvedUserId,
          (nextWatched) => {
            setWatched(nextWatched)
            if (shouldLoadPreviewOnly) {
              setCollectionCounts((current) => ({
                ...current,
                watched: Math.max(current?.watched ?? 0, nextWatched.length),
              }))
            }
            resolveStream('watched')
          },
          {
            activeTab: normalizedActiveTab || null,
            emitCachedPayloadOnSubscribe: !shouldForcePrivateRefresh,
            fetchOnSubscribe: shouldForcePrivateRefresh || !shouldUseSeededWatched,
            refreshOnSubscribe:
              shouldForcePrivateRefresh || normalizedActiveTab === 'watched',
            limitCount: watchedPreviewLimit,
            onError: (error) => {
              showAccountErrorToast(toast, error, 'Watched could not be loaded')
              resolveStream('watched')
            },
          }
        )
      }

      if (shouldSubscribeWatchlist) {
        unsubscribeWatchlist = subscribeToUserWatchlist(
          resolvedUserId,
          (nextWatchlist) => {
            setWatchlist(nextWatchlist)
            if (shouldLoadPreviewOnly) {
              setCollectionCounts((current) => ({
                ...current,
                watchlist: Math.max(
                  current?.watchlist ?? 0,
                  nextWatchlist.length
                ),
              }))
            }
            resolveStream('watchlist')
          },
          {
            activeTab: normalizedActiveTab || null,
            emitCachedPayloadOnSubscribe: !shouldForcePrivateRefresh,
            fetchOnSubscribe:
              shouldForcePrivateRefresh || !shouldUseSeededWatchlist,
            refreshOnSubscribe:
              shouldForcePrivateRefresh || normalizedActiveTab === 'watchlist',
            limitCount: watchlistPreviewLimit,
            onError: (error) => {
              showAccountErrorToast(toast, error, 'Watchlist could not be loaded')
              resolveStream('watchlist')
            },
          }
        )
      }

      if (shouldSubscribeLists) {
        unsubscribeLists = subscribeToUserLists(
          resolvedUserId,
          (nextLists) => {
            setLists(nextLists)
            if (shouldLoadPreviewOnly) {
              setCollectionCounts((current) => ({
                ...current,
                lists: Math.max(current?.lists ?? 0, nextLists.length),
              }))
            }
            resolveStream('lists')
          },
          {
            activeTab: normalizedActiveTab || null,
            emitCachedPayloadOnSubscribe: !shouldForcePrivateRefresh,
            fetchOnSubscribe: shouldForcePrivateRefresh || !shouldUseSeededLists,
            refreshOnSubscribe:
              shouldForcePrivateRefresh || normalizedActiveTab === 'lists',
            limitCount: listsPreviewLimit,
            onError: (error) => {
              showAccountErrorToast(toast, error, 'Lists could not be loaded')
              resolveStream('lists')
            },
          }
        )
      }
    }

    subscribe().catch((error) => {
      if (!isMounted) return
      showAccountErrorToast(toast, error, 'Collections could not be loaded')
      countsResolved = true
      resolveStream('likes')
      resolveStream('watched')
      resolveStream('watchlist')
      resolveStream('lists')
    })

    return () => {
      isMounted = false
      unsubscribeLikes()
      unsubscribeWatched()
      unsubscribeWatchlist()
      unsubscribeLists()
    }
  }, [
    authIsAuthenticated,
    authIsReady,
    canViewPrivateContent,
    hasInitialCollectionSnapshot,
    hasSeededLikes,
    hasSeededLists,
    hasSeededWatched,
    hasSeededWatchlist,
    initialCollectionCounts,
    initialCollections,
    initialLikes,
    initialLists,
    initialWatched,
    initialWatchlist,
    activeTab,
    isOwner,
    isPrivateProfile,
    likesPreviewLimit,
    resolvedUserId,
    toast,
    listsPreviewLimit,
    watchedPreviewLimit,
    watchlistPreviewLimit,
    shouldForcePrivateRefresh,
    shouldUseSeededLikes,
    shouldUseSeededLists,
    shouldUseSeededWatched,
    shouldUseSeededWatchlist,
  ])

  return {
    collectionCounts,
    isLoadingCollections,
    likes,
    lists,
    setLikes,
    setLists,
    setWatched,
    setWatchlist,
    watched,
    watchlist,
  }
}

export function useAccountRelationshipData({
  authIsReady,
  authUserId,
  canManageRequests,
  isOwner,
  isPrivateProfile,
  isProfileLoaded,
  publicFollowerCount = 0,
  publicFollowingCount = 0,
  resolvedUserId,
}) {
  const [followRelationship, setFollowRelationship] = useState({
    canViewPrivateContent: false,
    inboundStatus: null,
    isInboundRelationshipLoaded: false,
    isOutboundRelationshipLoaded: false,
    isPrivateProfile: false,
    isTargetProfileLoaded: false,
    outboundStatus: null,
    showFollowBack: false,
  })
  const [followerCount, setFollowerCount] = useState(publicFollowerCount)
  const [followingCount, setFollowingCount] = useState(publicFollowingCount)
  const [pendingFollowRequestCount, setPendingFollowRequestCount] = useState(0)

  useEffect(() => {
    if (!resolvedUserId || !authIsReady) {
      setFollowRelationship({
        canViewPrivateContent: false,
        inboundRelationship: null,
        inboundStatus: null,
        isInboundRelationshipLoaded: false,
        isOutboundRelationshipLoaded: false,
        isPrivateProfile: false,
        isTargetProfileLoaded: false,
        outboundRelationship: null,
        outboundStatus: null,
        showFollowBack: false,
      })
      return undefined
    }

    const unsubRelationship = subscribeToFollowRelationship(
      isOwner ? resolvedUserId : authUserId || null,
      resolvedUserId,
      (relationship) => {
        setFollowRelationship(relationship)
      }
    )

    return () => {
      unsubRelationship()
    }
  }, [authIsReady, authUserId, isOwner, resolvedUserId])

  useEffect(() => {
    if (!resolvedUserId) {
      setFollowerCount(0)
      setFollowingCount(0)
      setPendingFollowRequestCount(0)
      return undefined
    }

    if (!authIsReady) {
      setFollowerCount(publicFollowerCount)
      setFollowingCount(publicFollowingCount)
      setPendingFollowRequestCount(0)
      return undefined
    }

    const hasKnownPrivacyState =
      isOwner || isProfileLoaded || followRelationship.isTargetProfileLoaded
    const resolvedIsPrivateProfile = isProfileLoaded
      ? isPrivateProfile
      : followRelationship.isPrivateProfile

    if (!hasKnownPrivacyState) {
      setFollowerCount(publicFollowerCount)
      setFollowingCount(publicFollowingCount)
      setPendingFollowRequestCount(0)
      return undefined
    }

    const canReadFollowCollections =
      isOwner ||
      !resolvedIsPrivateProfile ||
      followRelationship.canViewPrivateContent

    if (!canReadFollowCollections) {
      setFollowerCount(publicFollowerCount)
      setFollowingCount(publicFollowingCount)
      setPendingFollowRequestCount(0)
      return undefined
    }

    if (!canManageRequests) {
      setPendingFollowRequestCount(0)
    }

    const unsubFollowers = subscribeToFollowers(
      resolvedUserId,
      (followers) => {
        setFollowerCount(followers.length)
      },
      {
        onError: () => {
          setFollowerCount(publicFollowerCount)
        },
      }
    )

    const unsubFollowing = subscribeToFollowing(
      resolvedUserId,
      (following) => {
        setFollowingCount(following.length)
      },
      {
        onError: () => {
          setFollowingCount(publicFollowingCount)
        },
      }
    )

    const unsubPendingFollowers =
      canManageRequests
        ? subscribeToFollowers(
            resolvedUserId,
            (requests) => {
              setPendingFollowRequestCount(requests.length)
            },
            {
              onError: () => {
                setPendingFollowRequestCount(0)
              },
              status: FOLLOW_STATUSES.PENDING,
            }
          )
        : () => {}

    return () => {
      unsubFollowers()
      unsubFollowing()
      unsubPendingFollowers()
    }
  }, [
    authIsReady,
    canManageRequests,
    followRelationship.canViewPrivateContent,
    followRelationship.isPrivateProfile,
    followRelationship.isTargetProfileLoaded,
    isPrivateProfile,
    isProfileLoaded,
    isOwner,
    publicFollowerCount,
    publicFollowingCount,
    resolvedUserId,
  ])

  return {
    followerCount,
    followingCount,
    followRelationship,
    pendingFollowRequestCount,
  }
}

export function useAccountSocialProof({
  authUserId,
  canViewPrivateContent,
  isOwner,
  isSocialFollowsEnabled,
  resolvedUserId,
}) {
  const [profileSocialProof, setProfileSocialProof] = useState(null)

  useEffect(() => {
    let ignore = false

    if (
      !isSocialFollowsEnabled ||
      !authUserId ||
      !resolvedUserId ||
      isOwner ||
      !canViewPrivateContent
    ) {
      setProfileSocialProof(null)
      return undefined
    }

    getAccountSocialProof({
      canViewPrivateContent,
      targetUserId: resolvedUserId,
      viewerId: authUserId,
    })
      .then((proof) => {
        if (!ignore) {
          setProfileSocialProof(proof)
        }
      })
      .catch((error) => {
        if (!ignore) {
          logDataError('[Profile] Social proof could not be loaded:', error)
          setProfileSocialProof(null)
        }
      })

    return () => {
      ignore = true
    }
  }, [
    authUserId,
    canViewPrivateContent,
    isOwner,
    isSocialFollowsEnabled,
    resolvedUserId,
  ])

  return { profileSocialProof }
}

export function useAccountListItems({
  activeListId,
  activeTab,
  canViewPrivateContent,
  isOwner,
  isPrivateProfile,
  resolvedUserId,
}) {
  const toast = useToast()
  const [listItems, setListItems] = useState([])
  const [isLoadingListItems, setIsLoadingListItems] = useState(false)

  useEffect(() => {
    if (activeTab !== 'lists' || !resolvedUserId || !activeListId) {
      setListItems([])
      setIsLoadingListItems(false)
      return undefined
    }

    if (!isOwner && isPrivateProfile && !canViewPrivateContent) {
      setListItems([])
      setIsLoadingListItems(false)
      return undefined
    }

    setIsLoadingListItems(true)

    return subscribeToUserListItems(
      resolvedUserId,
      activeListId,
      (nextItems) => {
        setListItems(nextItems)
        setIsLoadingListItems(false)
      },
      {
        activeTab,
        onError: (error) => {
          setListItems([])
          showAccountErrorToast(toast, error, 'List items could not be loaded')
          setIsLoadingListItems(false)
        },
      }
    )
  }, [
    activeListId,
    activeTab,
    canViewPrivateContent,
    isOwner,
    isPrivateProfile,
    resolvedUserId,
    toast,
  ])

  return {
    isLoadingListItems,
    listItems,
    setListItems,
  }
}

export function useAccountPageData({
  activeListId,
  activeTab,
  auth,
  collectionPreviewLimits = null,
  initialCollections = null,
  initialProfile = null,
  initialResolvedUserId = null,
  initialResolveError = null,
  isSocialFollowsEnabled,
  username,
}) {
  const isAuthSessionReady = useAuthSessionReady(
    auth.isAuthenticated ? auth.user?.id || null : null
  )
  const { isResolvingProfile, resolveError, resolvedUserId } =
    useAccountResolvedUser({
      authUserId: auth.user?.id || null,
      initialResolvedUserId,
      initialResolveError,
      username,
    })

  const { profile } = useAccountSubscription({
    resolvedUserId,
    initialProfile,
  })

  const isOwner = useMemo(() => {
    if (!username) {
      return Boolean(auth.user?.id || initialResolvedUserId)
    }

    if (!auth.isAuthenticated || !auth.user?.id) return false
    return profile?.id === auth.user.id || resolvedUserId === auth.user.id
  }, [
    auth.isAuthenticated,
    auth.user?.id,
    initialResolvedUserId,
    profile?.id,
    resolvedUserId,
    username,
  ])

  const isPrivateProfile =
    profile?.isPrivate === true
  const {
    followerCount,
    followingCount,
    followRelationship,
    pendingFollowRequestCount,
  } = useAccountRelationshipData({
    authIsReady: auth.isReady && isAuthSessionReady,
    authUserId: auth.user?.id || null,
    canManageRequests: Boolean(isOwner && isSocialFollowsEnabled && isPrivateProfile),
    isOwner,
    isPrivateProfile,
    isProfileLoaded: Boolean(profile),
    publicFollowerCount: Number(profile?.followerCount || 0),
    publicFollowingCount: Number(profile?.followingCount || 0),
    resolvedUserId,
  })

  const hasKnownPrivacyState =
    !resolvedUserId ||
    isOwner ||
    Boolean(profile) ||
    followRelationship.isTargetProfileLoaded
  const normalizedIsPrivateProfile = hasKnownPrivacyState
    ? isPrivateProfile || followRelationship.isPrivateProfile
    : Boolean(resolvedUserId) && !isOwner
  const requiresPrivateAccessResolution =
    hasKnownPrivacyState &&
    Boolean(resolvedUserId) &&
    !isOwner &&
    normalizedIsPrivateProfile
  const hasResolvedAccessState =
    !resolvedUserId ||
    (
      hasKnownPrivacyState &&
      (
        !requiresPrivateAccessResolution ||
        (
          auth.isReady &&
          (
            !auth.isAuthenticated ||
            (
              isAuthSessionReady &&
              followRelationship.isOutboundRelationshipLoaded
            )
          )
        )
      )
    )
  const canViewPrivateContent =
    isOwner || !normalizedIsPrivateProfile || followRelationship.canViewPrivateContent

  const {
    collectionCounts,
    isLoadingCollections,
    likes,
    lists,
    setLikes,
    setLists,
    setWatched,
    setWatchlist,
    watched,
    watchlist,
  } = useAccountCollections({
    activeTab,
    authIsAuthenticated: auth.isAuthenticated,
    authIsReady: auth.isReady && isAuthSessionReady,
    canViewPrivateContent,
    initialCollections,
    isOwner,
    isPrivateProfile: normalizedIsPrivateProfile,
    previewLimits: collectionPreviewLimits,
    resolvedUserId,
  })

  const { isLoadingListItems, listItems, setListItems } = useAccountListItems({
    activeListId,
    activeTab,
    canViewPrivateContent,
    isOwner,
    isPrivateProfile: normalizedIsPrivateProfile,
    resolvedUserId,
  })

  const { profileSocialProof } = useAccountSocialProof({
    authUserId: auth.user?.id || null,
    canViewPrivateContent,
    isOwner,
    isSocialFollowsEnabled,
    resolvedUserId,
  })

  return {
    canViewPrivateContent,
    favoriteShowcase: Array.isArray(profile?.favoriteShowcase)
      ? profile.favoriteShowcase
      : [],
    followerCount,
    followingCount,
    followRelationship,
    hasResolvedAccessState,
    likeCount:
      collectionCounts.likes === null ? likes.length : collectionCounts.likes,
    isLoadingCollections,
    isLoadingListItems,
    isAuthSessionReady,
    isOwner,
    isPrivateProfile: normalizedIsPrivateProfile,
    isResolvingProfile,
    likes,
    listItems,
    listCount:
      collectionCounts.lists === null ? lists.length : collectionCounts.lists,
    lists,
    pendingFollowRequestCount,
    profile,
    profileSocialProof,
    resolveError,
    resolvedUserId,
    setLikes,
    setLists,
    setListItems,
    setWatched,
    setWatchlist,
    watched,
    watchedCount:
      collectionCounts.watched === null ? watched.length : collectionCounts.watched,
    watchlist,
    watchlistCount:
      collectionCounts.watchlist === null
        ? watchlist.length
        : collectionCounts.watchlist,
  }
}

export function useAccountHeroHeight() {
  const heroRef = useRef(null)
  const [heroHeight, setHeroHeight] = useState(0)

  useEffect(() => {
    const element = heroRef.current
    if (!element) return

    const updateHeight = () => {
      const nextHeight = Math.round(element.getBoundingClientRect().height || 0)
      setHeroHeight(nextHeight)
    }

    updateHeight()

    if (typeof ResizeObserver !== 'function') return

    const observer = new ResizeObserver(updateHeight)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return { heroHeight, heroRef }
}

export function useAccountPageQueryState({ activeTabProp }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [activeTab, setActiveTab] = useState(() =>
    activeTabProp && PROFILE_TABS.includes(activeTabProp)
      ? activeTabProp
      : 'likes'
  )

  const activeListId = searchParams.get('list') || ''

  useEffect(() => {
    if (activeTabProp && PROFILE_TABS.includes(activeTabProp)) {
      setActiveTab((prev) => (prev === activeTabProp ? prev : activeTabProp))
      return
    }

    const tabParam = searchParams.get('tab')
    const nextTab =
      tabParam && PROFILE_TABS.includes(tabParam) ? tabParam : 'likes'

    setActiveTab((prev) => (prev === nextTab ? prev : nextTab))
  }, [activeTabProp, searchParams])

  const updateQuery = useCallback(
    (nextEntries = {}) => {
      const params = new URLSearchParams(searchParams.toString())

      Object.entries(nextEntries).forEach(([key, value]) => {
        if (value === null || value === undefined || value === '') {
          params.delete(key)
        } else {
          params.set(key, value)
        }
      })

      const query = params.toString()

      startTransition(() => {
        router.replace(query ? `${pathname}?${query}` : pathname, {
          scroll: false,
        })
      })
    },
    [pathname, router, searchParams]
  )

  const handleTabChange = useCallback(
    (tab) => {
      setActiveTab(tab)
      updateQuery({
        tab: tab === 'likes' ? null : tab,
        list: null,
      })
    },
    [updateQuery]
  )

  return {
    activeListId,
    activeTab,
    handleTabChange,
    updateQuery,
  }
}

export function useAccountPageActions({
  activeListId,
  auth,
  canViewPrivateContent = false,
  followRelationship,
  isOwner,
  isPrivateProfile = false,
  profile,
  resolvedUserId,
  selectedList,
  setLikes,
  setLists,
  setListItems,
  setWatchlist,
  updateQuery,
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const toast = useToast()
  const { openModal } = useModal()

  const [itemRemoveConfirmation, setItemRemoveConfirmation] = useState(null)
  const [listDeleteConfirmation, setListDeleteConfirmation] = useState(null)
  const [unfollowConfirmation, setUnfollowConfirmation] = useState(null)
  const [isFollowLoading, setIsFollowLoading] = useState(false)
  const currentPath = useMemo(
    () => getCurrentPathWithSearch(pathname, searchParams),
    [pathname, searchParams]
  )

  const handleEditList = useCallback(
    (list) => {
      const targetList = list || selectedList

      if (!isOwner || !auth.user?.id) return
      if (!targetList?.id) return

      openModal(
        'LIST_EDITOR_MODAL',
        { desktop: 'center', mobile: 'bottom' },
        {
          data: {
            isOwner: true,
            userId: auth.user.id,
            initialData: targetList,
          },
        }
      )
    },
    [auth.user?.id, isOwner, openModal, selectedList]
  )

  const handleDeleteList = useCallback(
    (list) => {
      const targetList = list || selectedList

      if (!isOwner || !auth.user?.id) return
      if (!targetList?.id) return

      setListDeleteConfirmation({
        title: 'Delete List?',
        confirmText: 'Delete List',
        description:
          'This removes the list and all items inside it from your profile',
        isDestructive: true,
        onCancel: () => setListDeleteConfirmation(null),
        onConfirm: async () => {
          let previousLists = null

          if (typeof setLists === 'function') {
            setLists((currentLists) => {
              previousLists = currentLists
              return currentLists.filter((current) => current?.id !== targetList.id)
            })
          }

          try {
            await deleteUserList({
              listId: targetList.id,
              userId: auth.user.id,
            })
            setListDeleteConfirmation(null)
            toast.success(`"${targetList.title}" was deleted`)

            if (activeListId === targetList.id) {
              updateQuery({ list: null, tab: 'lists' })
            }
          } catch (error) {
            if (previousLists && typeof setLists === 'function') {
              setLists(previousLists)
            }
            toast.error(error?.message || 'The list could not be deleted')
            throw error
          }
        },
      })
    },
    [
      activeListId,
      auth.user?.id,
      isOwner,
      selectedList,
      setLists,
      toast,
      updateQuery,
    ]
  )

  const handleConfirmUnfollow = useCallback(async () => {
    if (!auth.user?.id || !profile?.id) return

    setIsFollowLoading(true)

    try {
      await unfollowUser(auth.user.id, profile.id)
      setUnfollowConfirmation(null)
    } catch (error) {
      toast.error(error?.message || 'Follow state could not be updated')
      throw error
    } finally {
      setIsFollowLoading(false)
    }
  }, [auth.user?.id, profile?.id, toast])

  const handleSignInRequest = useCallback(() => {
    router.push(
      buildAuthHref(AUTH_ROUTES.SIGN_IN, {
        next: currentPath,
      })
    )
  }, [currentPath, router])

  const handleFollow = useCallback(async () => {
    if (!auth.isAuthenticated) {
      handleSignInRequest()
      return
    }

    if (!auth.user?.id || !profile?.id) {
      return
    }

    if (followRelationship.outboundStatus === FOLLOW_STATUSES.ACCEPTED) {
      const handle = profile?.username ? `@${profile.username}` : 'this user'
      const name = profile?.displayName || profile?.username || 'This user'

      setUnfollowConfirmation({
        title: `Unfollow ${handle}`,
        description:
          name === handle
            ? `${handle} will be removed from your following list until you follow again`
            : `${name} ${handle} will be removed from your following list until you follow again`,
        icon: getUserAvatarUrl(profile),
        confirmText: 'Unfollow',
        isDestructive: true,
        onCancel: () => setUnfollowConfirmation(null),
        onConfirm: handleConfirmUnfollow,
      })
      return
    }

    setIsFollowLoading(true)

    try {
      if (followRelationship.outboundStatus === FOLLOW_STATUSES.PENDING) {
        await cancelFollowRequest(auth.user.id, profile.id)
      } else {
        await followUser(auth.user.id, profile.id)
      }
    } catch (error) {
      toast.error(error?.message || 'Follow state could not be updated')
    } finally {
      setIsFollowLoading(false)
    }
  }, [
    auth.isAuthenticated,
    auth.user?.id,
    followRelationship.outboundStatus,
    handleConfirmUnfollow,
    handleSignInRequest,
    profile,
    toast,
  ])

  useEffect(() => {
    if (followRelationship.outboundStatus !== FOLLOW_STATUSES.ACCEPTED) {
      setUnfollowConfirmation(null)
    }
  }, [followRelationship.outboundStatus])

  const handleEditProfile = useCallback(() => {
    if (!isOwner) return
    router.push('/account/edit')
  }, [isOwner, router])

  const handleOpenFollowList = useCallback(
    (type) => {
      if (!resolvedUserId || !profile) {
        return
      }

      if (isPrivateProfile && !isOwner && !canViewPrivateContent) {
        return
      }

      const canManageRequests =
        isOwner &&
        profile?.isPrivate === true

      openModal('ACCOUNT_SOCIAL_MODAL', {desktop: "center", mobile: "bottom"}, {
        data: {
          canManageRequests,
          userId: resolvedUserId,
          tab: type,
        },
      })
    },
    [
      canViewPrivateContent,
      isOwner,
      isPrivateProfile,
      openModal,
      profile,
      resolvedUserId,
    ]
  )

  const handleRemoveListItem = useCallback(
    async (item) => {
      if (!isOwner || !selectedList || !auth.user?.id) return

      try {
        await toggleUserListItem({
          listId: selectedList.id,
          media: item,
          userId: auth.user.id,
        })
        setItemRemoveConfirmation(null)
        toast.success(`${getMediaTitle(item)} was removed from the list`)
      } catch (error) {
        toast.error(error?.message || 'The item could not be removed')
        throw error
      }
    },
    [auth.user?.id, isOwner, selectedList, toast]
  )

  const handleRequestRemoveListItem = useCallback(
    (item) => {
      if (!isOwner) return

      setItemRemoveConfirmation({
        title: 'Remove List Item?',
        description: `${getMediaTitle(item)} will be removed from this list.`,
        confirmText: 'Remove',
        confirmLoadingText: 'Removing',
        isDestructive: true,
        onCancel: () => setItemRemoveConfirmation(null),
        onConfirm: () => handleRemoveListItem(item),
      })
    },
    [handleRemoveListItem, isOwner]
  )

  const handleRemoveLike = useCallback(
    async (item) => {
      if (!isOwner || !auth.user?.id) return

      let previousLikes = null

      setLikes((currentLikes) => {
        previousLikes = currentLikes
        return filterCollectionItems(currentLikes, item)
      })

      try {
        await removeUserLike({
          media: item,
          mediaKey: item?.mediaKey || null,
          userId: auth.user.id,
        })
        setItemRemoveConfirmation(null)
        toast.success(`${getMediaTitle(item)} was removed from likes`)
      } catch (error) {
        if (previousLikes) {
          setLikes(previousLikes)
        }
        toast.error(error?.message || 'The item could not be removed')
        throw error
      }
    },
    [auth.user?.id, isOwner, setLikes, toast]
  )

  const handleRemoveWatchlistItem = useCallback(
    async (item) => {
      if (!isOwner || !auth.user?.id) return

      let previousWatchlist = null

      setWatchlist((currentWatchlist) => {
        previousWatchlist = currentWatchlist
        return filterCollectionItems(currentWatchlist, item)
      })

      try {
        await removeUserWatchlistItem({
          media: item,
          mediaKey: item?.mediaKey || null,
          userId: auth.user.id,
        })
        setItemRemoveConfirmation(null)
        toast.success(`${getMediaTitle(item)} was removed from watchlist`)
      } catch (error) {
        if (previousWatchlist) {
          setWatchlist(previousWatchlist)
        }
        toast.error(error?.message || 'The item could not be removed')
        throw error
      }
    },
    [auth.user?.id, isOwner, setWatchlist, toast]
  )

  const handleRequestRemoveLike = useCallback(
    (item) => {
      if (!isOwner) return

      setItemRemoveConfirmation({
        title: 'Remove Like?',
        description: `${getMediaTitle(item)} will be removed from your likes.`,
        confirmText: 'Remove',
        confirmLoadingText: 'Removing',
        isDestructive: true,
        onCancel: () => setItemRemoveConfirmation(null),
        onConfirm: () => handleRemoveLike(item),
      })
    },
    [handleRemoveLike, isOwner]
  )

  const handleRequestRemoveWatchlistItem = useCallback(
    (item) => {
      if (!isOwner) return

      setItemRemoveConfirmation({
        title: 'Remove Watchlist Item?',
        description: `${getMediaTitle(item)} will be removed from your watchlist.`,
        confirmText: 'Remove',
        confirmLoadingText: 'Removing',
        isDestructive: true,
        onCancel: () => setItemRemoveConfirmation(null),
        onConfirm: () => handleRemoveWatchlistItem(item),
      })
    },
    [handleRemoveWatchlistItem, isOwner]
  )

  const handleReorder = useCallback(
    async (nextItems, tab) => {
      if (!isOwner || !auth.user?.id) return

      if (tab === 'likes') setLikes(nextItems)
      if (tab === 'watchlist') setWatchlist(nextItems)
      if (tab === 'lists') setListItems(nextItems)

      try {
        const now = Date.now()
        const updates = nextItems
          .map((item, index) => {
            const newPosition = now - index
            let docRef

            if (tab === 'likes') {
              docRef = getLikeDocRef(auth.user.id, item)
            }

            if (tab === 'watchlist') {
              docRef = getWatchlistDocRef(auth.user.id, item)
            }

            if (tab === 'lists' && selectedList) {
              docRef = {
                id: item.mediaKey,
                listId: selectedList.id,
                table: 'list_items',
                userId: auth.user.id,
              }
            }

            return docRef ? updateUserMediaPosition(docRef, newPosition) : null
          })
          .filter(Boolean)

        await Promise.all(updates)
      } catch (error) {
        console.error(`[Profile] Failed to persist reorder for ${tab}:`, error)
        toast.error('Could not save custom order')
        throw error
      }
    },
    [
      auth.user?.id,
      isOwner,
      selectedList,
      setLikes,
      setListItems,
      setWatchlist,
      toast,
    ]
  )

  return {
    handleDeleteList,
    handleEditList,
    handleEditProfile,
    handleFollow,
    handleOpenFollowList,
    handleRemoveLike,
    handleRequestRemoveLike,
    handleRequestRemoveListItem,
    handleRequestRemoveWatchlistItem,
    handleRemoveListItem,
    handleRemoveWatchlistItem,
    handleReorder,
    handleSignInRequest,
    isFollowLoading,
    itemRemoveConfirmation,
    listDeleteConfirmation,
    unfollowConfirmation,
  }
}

export {
  useAccountCredentialActions,
  useAccountDeleteAction,
  useAccountEditData,
  useAccountGoogleLinking,
  useAccountSecurityActions,
} from './account-security-hooks'
