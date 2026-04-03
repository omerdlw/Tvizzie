'use client'

import { useEffect, useMemo, useState } from 'react'

import Link from 'next/link'

import { EmptyState } from '@/features/shared/empty-state'
import { applyAvatarFallback, getUserAvatarFallbackUrl, getUserAvatarUrl } from '@/lib/utils'
import { useAuth, useAuthSessionReady } from '@/modules/auth'
import Container from '@/modules/modal/container'
import { useToast } from '@/modules/notification/hooks'
import {
  FOLLOW_STATUSES,
  acceptFollowRequest,
  removeFollower,
  rejectFollowRequest,
  subscribeToFollowers,
  subscribeToFollowing,
  unfollowUser,
} from '@/services/social/follows.service'
import { Button } from '@/ui/elements'

const TABS = Object.freeze({
  FOLLOWERS: 'followers',
  FOLLOWING: 'following',
  INBOX: 'inbox',
})

function normalizeTab(value) {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()

  if (normalized === 'following') return TABS.FOLLOWING
  if (normalized === 'requests') return TABS.INBOX
  if (normalized === TABS.INBOX) return TABS.INBOX
  return TABS.FOLLOWERS
}

async function hydrateFollowUsers(list) {
  return (list || [])
    .map((item) => ({
      avatarUrl: item.avatarUrl || null,
      displayName: item.displayName || item.username || 'Anonymous User',
      id: item.userId || item.id,
      status: item.status || FOLLOW_STATUSES.ACCEPTED,
      username: item.username || null,
    }))
    .filter((item) => item.id)
}

function resolveCollectionErrorMessage(error, tab) {
  const status = Number(error?.status || 0)

  if (status === 403) {
    return tab === TABS.INBOX
      ? 'You are not allowed to view pending follow requests.'
      : 'This profile is private.'
  }

  if (status === 401) {
    return 'Your session has expired. Please sign in again.'
  }

  return tab === TABS.INBOX
    ? 'Pending follow requests could not be loaded.'
    : `Could not load ${tab}.`
}

function SocialUserRow({ close, user, children }) {
  const avatarSrc = getUserAvatarUrl(user)
  const avatarFallbackSrc = getUserAvatarFallbackUrl(user)

  return (
    <div className="flex items-center justify-between gap-3 p-4 transition-colors hover:bg-white/5">
      <Link
        className="flex min-w-0 flex-1 items-center gap-2.5"
        href={`/account/${user.username || user.id}`}
        onClick={close}
      >
        <img
          src={avatarSrc}
          alt={user.displayName}
          className="size-10 overflow-hidden shrink-0 object-cover rounded-[10px]"
          onError={(event) => applyAvatarFallback(event, avatarFallbackSrc)}
        />
        <div className="w-full">
          <p className="truncate text-sm font-semibold text-white">
            {user.displayName}
          </p>
          <p className="truncate text-[11px] text-white/70">
            @{user.username || 'user'}
          </p>
        </div>
      </Link>
      {children}
    </div>
  )
}

export default function AccountSocialModal({ close, data, header }) {
  const auth = useAuth()
  const isAuthSessionReady = useAuthSessionReady(
    auth.isAuthenticated ? auth.user?.id || null : null
  )
  const toast = useToast()
  const userId = String(data?.userId || '').trim() || null
  const canManageRequests = Boolean(data?.canManageRequests)
  const [activeTab, setActiveTab] = useState(() => normalizeTab(data?.tab || data?.type))
  const [followers, setFollowers] = useState([])
  const [following, setFollowing] = useState([])
  const [requests, setRequests] = useState([])
  const [isLoadingFollowers, setIsLoadingFollowers] = useState(true)
  const [isLoadingFollowing, setIsLoadingFollowing] = useState(true)
  const [isLoadingRequests, setIsLoadingRequests] = useState(canManageRequests)
  const [followersError, setFollowersError] = useState(null)
  const [followingError, setFollowingError] = useState(null)
  const [requestsError, setRequestsError] = useState(null)
  const [actionState, setActionState] = useState({
    kind: null,
    userId: null,
  })

  useEffect(() => {
    setActiveTab(normalizeTab(data?.tab || data?.type))
  }, [data?.tab, data?.type])

  useEffect(() => {
    if (!userId) {
      setFollowers([])
      setIsLoadingFollowers(false)
      setFollowersError(null)
      return undefined
    }

    setFollowers([])
    setIsLoadingFollowers(true)
    setFollowersError(null)
    return subscribeToFollowers(
      userId,
      async (list) => {
        const hydrated = await hydrateFollowUsers(list)
        setFollowers(hydrated)
        setIsLoadingFollowers(false)
        setFollowersError(null)
      },
      {
        emitCachedPayloadOnSubscribe: false,
        refreshOnSubscribe: true,
        status: FOLLOW_STATUSES.ACCEPTED,
        onError: (error) => {
          setFollowers([])
          setFollowersError(error)
          setIsLoadingFollowers(false)
        },
      }
    )
  }, [userId])

  useEffect(() => {
    if (!userId) {
      setFollowing([])
      setIsLoadingFollowing(false)
      setFollowingError(null)
      return undefined
    }

    setFollowing([])
    setIsLoadingFollowing(true)
    setFollowingError(null)
    return subscribeToFollowing(
      userId,
      async (list) => {
        const hydrated = await hydrateFollowUsers(list)
        setFollowing(hydrated)
        setIsLoadingFollowing(false)
        setFollowingError(null)
      },
      {
        emitCachedPayloadOnSubscribe: false,
        refreshOnSubscribe: true,
        status: FOLLOW_STATUSES.ACCEPTED,
        onError: (error) => {
          setFollowing([])
          setFollowingError(error)
          setIsLoadingFollowing(false)
        },
      }
    )
  }, [userId])

  useEffect(() => {
    if (!canManageRequests || !auth.user?.id) {
      setRequests([])
      setIsLoadingRequests(false)
      setRequestsError(null)
      return undefined
    }

    if (!isAuthSessionReady) {
      setRequests([])
      setIsLoadingRequests(true)
      setRequestsError(null)
      return undefined
    }

    setRequests([])
    setIsLoadingRequests(true)
    setRequestsError(null)
    return subscribeToFollowers(
      auth.user.id,
      async (list) => {
        const hydrated = await hydrateFollowUsers(list)
        setRequests(hydrated)
        setIsLoadingRequests(false)
        setRequestsError(null)
      },
      {
        emitCachedPayloadOnSubscribe: false,
        refreshOnSubscribe: true,
        status: FOLLOW_STATUSES.PENDING,
        onError: (error) => {
          setRequests([])
          setRequestsError(error)
          setIsLoadingRequests(false)
        },
      }
    )
  }, [auth.user?.id, canManageRequests, isAuthSessionReady])

  const shouldShowInboxTab =
    canManageRequests &&
    (isLoadingRequests || requests.length > 0 || Boolean(requestsError))
  const isOwnProfile = Boolean(auth.user?.id) && auth.user.id === userId

  useEffect(() => {
    if (activeTab === TABS.INBOX && !shouldShowInboxTab) {
      setActiveTab(TABS.FOLLOWERS)
    }
  }, [activeTab, shouldShowInboxTab])

  const tabs = useMemo(() => {
    const baseTabs = [
      { key: TABS.FOLLOWING, label: 'Following' },
      { key: TABS.FOLLOWERS, label: 'Followers' },
    ]

    if (shouldShowInboxTab) {
      baseTabs.push({
        key: TABS.INBOX,
        label: requests.length > 0 ? `Inbox ${requests.length}` : 'Inbox',
      })
    }

    return baseTabs
  }, [requests.length, shouldShowInboxTab])

  const list = activeTab === TABS.FOLLOWING
    ? following
    : activeTab === TABS.INBOX
      ? requests
      : followers
  const isLoading = activeTab === TABS.FOLLOWING
    ? isLoadingFollowing
    : activeTab === TABS.INBOX
      ? isLoadingRequests
      : isLoadingFollowers
  const activeError = activeTab === TABS.FOLLOWING
    ? followingError
    : activeTab === TABS.INBOX
      ? requestsError
      : followersError
  const activeErrorMessage = activeError
    ? resolveCollectionErrorMessage(activeError, activeTab)
    : null

  const emptyDescription = activeTab === TABS.INBOX
    ? 'No pending follow requests'
    : `No ${activeTab} yet`

  const handleAccept = async (requesterId) => {
    if (!auth.user?.id || actionState.userId) return

    setActionState({ kind: 'accept', userId: requesterId })

    try {
      await acceptFollowRequest(auth.user.id, requesterId)
      toast.success('Follow request accepted')
    } catch (error) {
      toast.error(error?.message || 'Request could not be accepted')
    } finally {
      setActionState({ kind: null, userId: null })
    }
  }

  const handleReject = async (requesterId) => {
    if (!auth.user?.id || actionState.userId) return

    setActionState({ kind: 'reject', userId: requesterId })

    try {
      await rejectFollowRequest(auth.user.id, requesterId)
      toast.success('Follow request rejected')
    } catch (error) {
      toast.error(error?.message || 'Request could not be rejected')
    } finally {
      setActionState({ kind: null, userId: null })
    }
  }

  const handleUnfollow = async (targetUserId) => {
    if (!auth.user?.id || actionState.userId) return

    setActionState({ kind: 'unfollow', userId: targetUserId })

    try {
      await unfollowUser(auth.user.id, targetUserId)
      toast.success('User unfollowed')
    } catch (error) {
      toast.error(error?.message || 'Could not unfollow this user')
    } finally {
      setActionState({ kind: null, userId: null })
    }
  }

  const handleRemoveFollower = async (followerId) => {
    if (!auth.user?.id || actionState.userId) return

    setActionState({ kind: 'remove-follower', userId: followerId })

    try {
      await removeFollower(auth.user.id, followerId)
      toast.success('Follower removed')
    } catch (error) {
      toast.error(error?.message || 'Could not remove follower')
    } finally {
      setActionState({ kind: null, userId: null })
    }
  }

  return (
    <Container
      className="max-h-[74vh] w-full sm:w-[500px] min-h-96"
      header={header}
      close={close}
    >
      <div className="flex h-full min-h-0 flex-col">
        <div
          style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
          className="grid gap-2"
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={[
                  'px-3 py-5 text-xs font-semibold border border-transparent tracking-wide uppercase transition',
                  isActive
                    ? 'border-b-white/10 text-white'
                    : 'text-white/70',
                ].join(' ')}
              >
                {tab.label}
              </button>
            )
          })}
        </div>

        {isLoading ? (
          <div className="flex flex-col">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((item) => (
              <div
                key={item}
                className="h-14 animate-pulse bg-white/5 border-b border-white/10 last:border-none"
              />
            ))}
          </div>
        ) : activeErrorMessage ? (
          <EmptyState
            description={activeErrorMessage}
            className="h-full"
          />
        ) : list.length === 0 ? (
          <EmptyState
            title="Empty"
            description={emptyDescription}
            className="h-full min-h-96 bg-white/5"
          />
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto">
            {list.map((user) => (
              <SocialUserRow key={user.id} close={close} user={user}>
                {activeTab === TABS.INBOX ? (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="success"
                      onClick={() => handleAccept(user.id)}
                      disabled={actionState.userId === user.id}
                      className="px-2 py-1 text-[11px] w-auto shrink-0 rounded-[10px]"
                    >
                      {actionState.userId === user.id && actionState.kind === 'accept'
                        ? 'Accepting'
                        : 'Accept'}
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => handleReject(user.id)}
                      disabled={actionState.userId === user.id}
                      className="px-2 py-1 text-[11px] w-auto shrink-0 rounded-[10px]"
                    >
                      {actionState.userId === user.id && actionState.kind === 'reject'
                        ? 'Rejecting'
                        : 'Reject'}
                    </Button>
                  </div>
                ) : activeTab === TABS.FOLLOWING && isOwnProfile ? (
                  <Button
                    variant="destructive"
                    onClick={() => handleUnfollow(user.id)}
                    disabled={actionState.userId === user.id}
                    className="px-2 py-1 text-[11px] w-auto shrink-0 rounded-[10px]"
                  >
                    {actionState.userId === user.id && actionState.kind === 'unfollow'
                      ? 'Unfollowing'
                      : 'Unfollow'}
                  </Button>
                ) : activeTab === TABS.FOLLOWERS && isOwnProfile ? (
                  <Button
                    variant="destructive"
                    onClick={() => handleRemoveFollower(user.id)}
                    disabled={actionState.userId === user.id}
                    className="px-2 py-1 text-[11px] w-auto shrink-0 rounded-[10px]"
                  >
                    {actionState.userId === user.id && actionState.kind === 'remove-follower'
                      ? 'Removing'
                      : 'Remove'}
                  </Button>
                ) : null}
              </SocialUserRow>
            ))}
          </div>
        )}
      </div>
    </Container>
  )
}
