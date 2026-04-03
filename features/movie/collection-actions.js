'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import {
  AUTH_ROUTES,
  buildAuthHref,
  getCurrentPathWithSearch,
} from '@/features/auth'
import { resolveExplicitMediaType } from '@/core/utils/media'
import { cn } from '@/core/utils'
import { useAuth, useAuthSessionReady } from '@/core/modules/auth'
import { useModal } from '@/core/modules/modal/context'
import { useToast } from '@/core/modules/notification/hooks'
import {
  ensureLegacyFavoritesBackfilled,
  subscribeToLikeStatus,
  toggleUserLike,
} from '@/core/services/media/likes.service'
import {
  markUserWatched,
  removeUserWatchedItem,
  subscribeToWatchedStatus,
} from '@/core/services/media/watched.service'
import {
  subscribeToWatchlistStatus,
  toggleUserWatchlistItem,
} from '@/core/services/media/watchlist.service'
import Icon from '@/ui/icon'

const FROSTED_BACKDROP_STYLE = {
  WebkitBackdropFilter: 'blur(12px)',
  backdropFilter: 'blur(12px)',
}

function getMediaSnapshot(media) {
  return {
    backdropPath: media?.backdrop_path || media?.backdropPath || null,
    entityId: media?.id,
    entityType: resolveExplicitMediaType(media, 'movie'),
    first_air_date: null,
    name: '',
    posterPath: media?.poster_path || media?.posterPath || null,
    release_date: media?.release_date || null,
    title: media?.title || media?.original_title || 'Untitled',
    vote_average: media?.vote_average ?? null,
  }
}

function getActionPalette(palette, active) {
  if (!active) {
    return 'surface-muted'
  }

  if (palette === 'like') {
    return 'success-classes'
  }

  if (palette === 'watchlist') {
    return 'info-classes'
  }

  return 'info-classes'
}

function ActionButton({
  active = false,
  disabled = false,
  icon,
  label,
  loading = false,
  loadingLabel = 'Loading',
  onClick,
  palette = 'neutral',
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'group flex w-full rounded-[12px] cursor-pointer items-center backdrop-blur-sm justify-center gap-2 px-4 py-3 text-xs font-bold tracking-wide uppercase  transition-all duration-(--motion-duration-normal) disabled:cursor-not-allowed',
        getActionPalette(palette, active)
      )}
    >
      {loading ? (
        <span>{loadingLabel}</span>
      ) : (
        <>
          <Icon
            icon={icon}
            size={16}
            className="transition-transform group-hover:scale-110"
          />
          <span>{label}</span>
        </>
      )}
    </button>
  )
}

export default function CollectionActions({ media }) {
  const auth = useAuth()
  const isAuthSessionReady = useAuthSessionReady(
    auth.isAuthenticated ? auth.user?.id || null : null
  )
  const toast = useToast()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { openModal } = useModal()

  const [isLiked, setIsLiked] = useState(false)
  const [isInWatchlist, setIsInWatchlist] = useState(false)
  const [isWatched, setIsWatched] = useState(false)
  const [isLoadingLike, setIsLoadingLike] = useState(true)
  const [isLoadingWatchlist, setIsLoadingWatchlist] = useState(true)
  const [isLoadingWatched, setIsLoadingWatched] = useState(true)
  const [isSubmittingLike, setIsSubmittingLike] = useState(false)
  const [isSubmittingWatchlist, setIsSubmittingWatchlist] = useState(false)
  const [isSubmittingWatched, setIsSubmittingWatched] = useState(false)
  const [likeIntent, setLikeIntent] = useState(null)
  const [watchlistIntent, setWatchlistIntent] = useState(null)
  const [watchedIntent, setWatchedIntent] = useState(null)

  const userId = auth.user?.id || null
  const title = media?.title || media?.original_title || 'This movie'
  const currentPath = useMemo(
    () => getCurrentPathWithSearch(pathname, searchParams),
    [pathname, searchParams]
  )
  const mediaSnapshot = useMemo(() => getMediaSnapshot(media), [media])

  useEffect(() => {
    if (!auth.isReady) {
      setIsLoadingLike(true)
      setIsLoadingWatchlist(true)
      setIsLoadingWatched(true)
      return
    }

    if (userId && !isAuthSessionReady) {
      setIsLoadingLike(true)
      setIsLoadingWatchlist(true)
      setIsLoadingWatched(true)
      return
    }

    if (!userId) {
      setIsLiked(false)
      setIsInWatchlist(false)
      setIsWatched(false)
      setIsLoadingLike(false)
      setIsLoadingWatchlist(false)
      setIsLoadingWatched(false)
      return
    }

    let isMounted = true

    setIsLoadingLike(true)
    setIsLoadingWatchlist(true)
    setIsLoadingWatched(true)

    let unsubscribeLike = () => {}
    let unsubscribeWatchlist = () => {}
    let unsubscribeWatched = () => {}

    async function subscribe() {
      await ensureLegacyFavoritesBackfilled(userId)

      if (!isMounted) {
        return
      }

      unsubscribeLike = subscribeToLikeStatus(
        { media: mediaSnapshot, userId },
        (nextIsLiked) => {
          setIsLiked(nextIsLiked)
          setIsLoadingLike(false)
        },
        {
          onError: () => setIsLoadingLike(false),
        }
      )

      unsubscribeWatchlist = subscribeToWatchlistStatus(
        { media: mediaSnapshot, userId },
        (nextIsInWatchlist) => {
          setIsInWatchlist(nextIsInWatchlist)
          setIsLoadingWatchlist(false)
        },
        {
          onError: () => setIsLoadingWatchlist(false),
        }
      )

      unsubscribeWatched = subscribeToWatchedStatus(
        { media: mediaSnapshot, userId },
        (nextIsWatched) => {
          setIsWatched(nextIsWatched)
          setIsLoadingWatched(false)
        },
        {
          onError: () => setIsLoadingWatched(false),
        }
      )
    }

    subscribe().catch(() => {
      if (isMounted) {
        setIsLoadingLike(false)
        setIsLoadingWatchlist(false)
        setIsLoadingWatched(false)
      }
    })

    return () => {
      isMounted = false
      unsubscribeLike()
      unsubscribeWatchlist()
      unsubscribeWatched()
    }
  }, [auth.isReady, isAuthSessionReady, mediaSnapshot, userId])

  const redirectToSignIn = useCallback(() => {
    router.push(
      buildAuthHref(AUTH_ROUTES.SIGN_IN, {
        next: currentPath,
      })
    )
  }, [currentPath, router])

  const ensureSignedIn = useCallback(async () => {
    if (auth.isAuthenticated && userId) {
      return userId
    }

    redirectToSignIn()
    return null
  }, [auth.isAuthenticated, redirectToSignIn, userId])

  const handleLikeClick = useCallback(async () => {
    if (isSubmittingLike) {
      return
    }

    const resolvedUserId = await ensureSignedIn()
    if (!resolvedUserId) {
      return
    }

    setIsSubmittingLike(true)
    setLikeIntent(isLiked ? 'remove' : 'add')

    try {
      const result = await toggleUserLike({
        media: mediaSnapshot,
        userId: resolvedUserId,
      })
      setIsLiked(result.isLiked)

      toast.success(
        result.isLiked
          ? `${title} was added to your likes`
          : `${title} was removed from your likes`
      )
    } catch (error) {
      toast.error(error?.message || 'Like could not be updated')
    } finally {
      setIsSubmittingLike(false)
      setLikeIntent(null)
    }
  }, [
    ensureSignedIn,
    isLiked,
    isSubmittingLike,
    mediaSnapshot,
    title,
    toast,
  ])

  const handleWatchlistClick = useCallback(async () => {
    if (isSubmittingWatchlist) {
      return
    }

    const resolvedUserId = await ensureSignedIn()
    if (!resolvedUserId) {
      return
    }

    setIsSubmittingWatchlist(true)
    setWatchlistIntent(isInWatchlist ? 'remove' : 'add')

    try {
      const result = await toggleUserWatchlistItem({
        media: mediaSnapshot,
        userId: resolvedUserId,
      })
      setIsInWatchlist(result.isInWatchlist)

      toast.success(
        result.isInWatchlist
          ? `${title} was added to your watchlist`
          : `${title} was removed from your watchlist`
      )
    } catch (error) {
      toast.error(error?.message || 'Watchlist could not be updated')
    } finally {
      setIsSubmittingWatchlist(false)
      setWatchlistIntent(null)
    }
  }, [
    ensureSignedIn,
    isInWatchlist,
    isSubmittingWatchlist,
    mediaSnapshot,
    title,
    toast,
  ])

  const handleOpenListPicker = useCallback(async () => {
    const resolvedUserId = await ensureSignedIn()
    if (!resolvedUserId) {
      return
    }

    openModal('LIST_PICKER_MODAL', 'bottom', {
      data: {
        media: mediaSnapshot,
        userId: resolvedUserId,
      },
    })
  }, [ensureSignedIn, mediaSnapshot, openModal])

  const handleWatchedClick = useCallback(async () => {
    if (isSubmittingWatched) {
      return
    }

    const resolvedUserId = await ensureSignedIn()
    if (!resolvedUserId) {
      return
    }

    setIsSubmittingWatched(true)
    setWatchedIntent(isWatched ? 'remove' : 'add')

    try {
      if (isWatched) {
        await removeUserWatchedItem({
          media: mediaSnapshot,
          userId: resolvedUserId,
        })
        setIsWatched(false)
        toast.success(`${title} was removed from watched`)
      } else {
        const result = await markUserWatched({
          media: mediaSnapshot,
          userId: resolvedUserId,
        })
        setIsWatched(true)

        if (result.wasRemovedFromWatchlist) {
          setIsInWatchlist(false)
        }

        toast.success(
          result.wasRemovedFromWatchlist
            ? `${title} was marked watched and removed from your watchlist`
            : `${title} was marked as watched`
        )
      }
    } catch (error) {
      toast.error(error?.message || 'Watched state could not be updated')
    } finally {
      setIsSubmittingWatched(false)
      setWatchedIntent(null)
    }
  }, [
    ensureSignedIn,
    isSubmittingWatched,
    isWatched,
    mediaSnapshot,
    title,
    toast,
  ])

  return (
    <div className="flex flex-col gap-2">
      <ActionButton
        active={isLiked}
        disabled={isLoadingLike || isSubmittingLike}
        icon={isLiked ? 'solar:heart-bold' : 'solar:heart-linear'}
        label={isLiked ? 'Liked' : 'Like'}
        loading={isLoadingLike || isSubmittingLike}
        loadingLabel={
          isLoadingLike
            ? 'Checking'
            : likeIntent === 'remove'
              ? 'Removing'
              : 'Adding'
        }
        onClick={handleLikeClick}
        palette="like"
      />

      <ActionButton
        active={isWatched}
        disabled={isLoadingWatched || isSubmittingWatched}
        icon={isWatched ? 'solar:eye-bold' : 'solar:eye-linear'}
        label={isWatched ? 'Unwatch' : 'Mark Watched'}
        loading={isLoadingWatched || isSubmittingWatched}
        loadingLabel={
          isLoadingWatched
            ? 'Checking'
            : watchedIntent === 'remove'
              ? 'Removing'
              : 'Saving'
        }
        onClick={handleWatchedClick}
        palette="neutral"
      />

      <ActionButton
        active={isInWatchlist}
        disabled={isLoadingWatchlist || isSubmittingWatchlist}
        icon={isInWatchlist ? 'solar:bookmark-bold' : 'solar:bookmark-linear'}
        label={isInWatchlist ? 'In Watchlist' : 'Watchlist'}
        loading={isLoadingWatchlist || isSubmittingWatchlist}
        loadingLabel={
          isLoadingWatchlist
            ? 'Checking'
            : watchlistIntent === 'remove'
              ? 'Removing'
              : 'Adding'
        }
        onClick={handleWatchlistClick}
        palette="watchlist"
      />

      <ActionButton
        icon="solar:list-broken"
        label="Add To List"
        onClick={handleOpenListPicker}
        palette="neutral"
      />
    </div>
  )
}
