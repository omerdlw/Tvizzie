'use client'

import { useState } from 'react'

import ConfirmationModal from '@/components/modals/confirmation-modal'
import ImagePreviewModal from '@/components/modals/image-preview'
import VideoPreviewModal from '@/components/modals/video-preview-modal'
import ReviewAction from '@/components/nav-actions/review-action'
import SearchAction from '@/components/nav-actions/search-action'
import TVAction from '@/components/nav-actions/tv-action'
import { useRegistry } from '@/lib/hooks'

const TMDB_IMG = 'https://image.tmdb.org/t/p'

export function TvRegistry({
  show,
  yearRange,
  numberOfSeasons,
  numberOfEpisodes,
  activeView,
  setActiveView,
  isLoading = false,
  reviewState,
}) {
  const [isSearching, setIsSearching] = useState(false)

  const title =
    show?.name || show?.original_name || (isLoading ? '' : undefined)

  useRegistry({
    nav: {
      title,
      description: (
        <span className="flex items-center gap-1.5 text-white/60">
          {yearRange && <span>{yearRange}</span>}
          {numberOfSeasons > 0 && <span>•</span>}
          {numberOfSeasons > 0 && (
            <span>
              {numberOfSeasons} {numberOfSeasons === 1 ? 'Season' : 'Seasons'}
            </span>
          )}
          {numberOfEpisodes > 0 && <span>•</span>}
          {numberOfEpisodes > 0 && (
            <span>
              {numberOfEpisodes}{' '}
              {numberOfEpisodes === 1 ? 'Episode' : 'Episodes'}
            </span>
          )}
        </span>
      ),
      icon: show?.poster_path
        ? `${TMDB_IMG}/original${show.poster_path}`
        : undefined,
      isLoading,
      actions: [
        {
          key: 'search-overlay',
          tooltip: 'Search',
          icon: isSearching
            ? 'solar:close-circle-bold'
            : 'solar:magnifer-linear',
          order: 30,
          onClick: (e) => {
            e.stopPropagation()
            setIsSearching((prev) => !prev)
          },
        },
      ],
      action: reviewState?.isActive ? (
        <ReviewAction reviewState={reviewState} />
      ) : isSearching ? (
        <SearchAction />
      ) : (
        <TVAction activeView={activeView} setActiveView={setActiveView} />
      ),
    },
    background: {
      overlay: true,
      overlayOpacity: 0.7,
      noiseStyle: {
        opacity: 0.5,
      },
      image: show?.backdrop_path
        ? `${TMDB_IMG}/original${show.backdrop_path}`
        : undefined,
    },
    loading: { isLoading: false },
    modal: {
      PREVIEW_MODAL: ImagePreviewModal,
      VIDEO_PREVIEW_MODAL: VideoPreviewModal,
      CONFIRMATION_MODAL: ConfirmationModal,
    },
  })

  return null
}
