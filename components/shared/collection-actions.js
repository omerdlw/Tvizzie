'use client'

import { useEffect, useMemo, useState } from 'react'

import ListPickerModal from '@/components/modals/list-picker-modal'
import { useRegistry } from '@/lib/hooks/use-registry'
import { cn } from '@/lib/utils'
import { useAuth } from '@/modules/auth'
import { useModal } from '@/modules/modal/context'
import { useToast } from '@/modules/notification/hooks'
import {
  subscribeToFavoriteStatus,
  toggleUserFavorite,
} from '@/services/favorites.service'
import {
  subscribeToWatchlistStatus,
  toggleUserWatchlistItem,
} from '@/services/watchlist.service'
import Icon from '@/ui/icon'

function ActionButton({
  active = false,
  disabled = false,
  icon,
  label,
  onClick,
  palette = 'neutral',
}) {
  const paletteClasses = {
    favorite: active
      ? 'border border-success/35 bg-success/15 text-success'
      : 'border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white',
    watchlist: active
      ? 'border border-info/35 bg-info/15 text-info'
      : 'border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white',
    neutral: active
      ? 'border border-white/20 bg-white/15 text-white'
      : 'border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white',
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'group flex w-full cursor-pointer items-center justify-center gap-2 rounded-[20px] px-4 py-3 text-xs font-bold tracking-[0.18em] uppercase backdrop-blur-sm transition-all duration-[var(--motion-duration-normal)] disabled:cursor-not-allowed disabled:opacity-60',
        paletteClasses[palette]
      )}
    >
      <Icon
        icon={icon}
        size={16}
        className="transition-transform group-hover:scale-110"
      />
      <span>{label}</span>
    </button>
  )
}

export default function CollectionActions({ media }) {
  const auth = useAuth()
  const toast = useToast()
  const { openModal } = useModal()
  const [isFavorite, setIsFavorite] = useState(false)
  const [isInWatchlist, setIsInWatchlist] = useState(false)
  const [isLoadingFavorite, setIsLoadingFavorite] = useState(true)
  const [isLoadingWatchlist, setIsLoadingWatchlist] = useState(true)
  const [isSubmittingFavorite, setIsSubmittingFavorite] = useState(false)
  const [isSubmittingWatchlist, setIsSubmittingWatchlist] = useState(false)

  const title = media?.title || media?.name || 'This title'
  const mediaSnapshot = useMemo(
    () => ({
      backdropPath: media?.backdrop_path || media?.backdropPath || null,
      entityId: media?.id,
      entityType: media?.entityType || (media?.name ? 'tv' : 'movie'),
      first_air_date: media?.first_air_date || null,
      name: media?.name || media?.original_name || '',
      posterPath: media?.poster_path || media?.posterPath || null,
      release_date: media?.release_date || null,
      title: media?.title || media?.original_title || '',
      vote_average: media?.vote_average ?? null,
    }),
    [media]
  )

  useRegistry({
    modal: {
      LIST_PICKER_MODAL: ListPickerModal,
    },
  })

  useEffect(() => {
    if (!auth.isReady) {
      setIsLoadingFavorite(true)
      setIsLoadingWatchlist(true)
      return undefined
    }

    if (!auth.user?.id) {
      setIsFavorite(false)
      setIsInWatchlist(false)
      setIsLoadingFavorite(false)
      setIsLoadingWatchlist(false)
      return undefined
    }

    setIsLoadingFavorite(true)
    setIsLoadingWatchlist(true)

    const unsubscribeFavorite = subscribeToFavoriteStatus(
      {
        media: mediaSnapshot,
        userId: auth.user.id,
      },
      (nextIsFavorite) => {
        setIsFavorite(nextIsFavorite)
        setIsLoadingFavorite(false)
      },
      {
        onError: () => {
          setIsLoadingFavorite(false)
        },
      }
    )

    const unsubscribeWatchlist = subscribeToWatchlistStatus(
      {
        media: mediaSnapshot,
        userId: auth.user.id,
      },
      (nextIsInWatchlist) => {
        setIsInWatchlist(nextIsInWatchlist)
        setIsLoadingWatchlist(false)
      },
      {
        onError: () => {
          setIsLoadingWatchlist(false)
        },
      }
    )

    return () => {
      unsubscribeFavorite()
      unsubscribeWatchlist()
    }
  }, [auth.isReady, auth.user?.id, mediaSnapshot])

  async function openAuthModal() {
    return openModal('AUTH_MODAL', 'bottom', {
      data: {
        mode: 'sign-in',
      },
    })
  }

  async function ensureSignedIn() {
    if (auth.isAuthenticated && auth.user?.id) {
      return auth.user.id
    }

    const result = await openAuthModal()
    const modalUserId = result?.session?.user?.id || null

    if (modalUserId) return modalUserId

    return auth.user?.id || null
  }

  async function handleFavoriteClick() {
    if (isSubmittingFavorite) return

    const userId = await ensureSignedIn()
    if (!userId) return

    setIsSubmittingFavorite(true)

    try {
      const result = await toggleUserFavorite({
        media: mediaSnapshot,
        userId,
      })

      toast.success(
        result.isFavorite
          ? `${title} was added to your favorites`
          : `${title} was removed from your favorites`
      )
    } catch (error) {
      toast.error(error?.message || 'Favorite could not be updated')
    } finally {
      setIsSubmittingFavorite(false)
    }
  }

  async function handleWatchlistClick() {
    if (isSubmittingWatchlist) return

    const userId = await ensureSignedIn()
    if (!userId) return

    setIsSubmittingWatchlist(true)

    try {
      const result = await toggleUserWatchlistItem({
        media: mediaSnapshot,
        userId,
      })

      toast.success(
        result.isInWatchlist
          ? `${title} was added to your watchlist`
          : `${title} was removed from your watchlist`
      )
    } catch (error) {
      toast.error(error?.message || 'Watchlist could not be updated')
    } finally {
      setIsSubmittingWatchlist(false)
    }
  }

  async function handleOpenListPicker() {
    const userId = await ensureSignedIn()
    if (!userId) return

    openModal('LIST_PICKER_MODAL', 'bottom', {
      data: {
        media: mediaSnapshot,
        userId,
      },
    })
  }

  return (
    <div className="flex flex-col gap-2.5">
      <ActionButton
        active={isFavorite}
        disabled={isLoadingFavorite || isSubmittingFavorite}
        icon={
          isLoadingFavorite || isSubmittingFavorite
            ? 'solar:spinner-bold'
            : isFavorite
              ? 'solar:heart-bold'
              : 'solar:heart-linear'
        }
        label={
          isSubmittingFavorite
            ? 'Saving'
            : isFavorite
              ? 'Favorited'
              : 'Add Favorite'
        }
        onClick={handleFavoriteClick}
        palette="favorite"
      />

      <ActionButton
        active={isInWatchlist}
        disabled={isLoadingWatchlist || isSubmittingWatchlist}
        icon={
          isLoadingWatchlist || isSubmittingWatchlist
            ? 'solar:spinner-bold'
            : isInWatchlist
              ? 'solar:bookmark-bold'
              : 'solar:bookmark-linear'
        }
        label={
          isSubmittingWatchlist
            ? 'Updating'
            : isInWatchlist
              ? 'In Watchlist'
              : 'Watchlist'
        }
        onClick={handleWatchlistClick}
        palette="watchlist"
      />

      <ActionButton
        icon="solar:list-heart-bold"
        label="Add To List"
        onClick={handleOpenListPicker}
        palette="neutral"
      />
    </div>
  )
}
