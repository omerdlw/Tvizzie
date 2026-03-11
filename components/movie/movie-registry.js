'use client'

import { useState } from 'react'

import ConfirmationModal from '@/components/modals/confirmation-modal'
import ImagePreviewModal from '@/components/modals/image-preview'
import VideoPreviewModal from '@/components/modals/video-preview-modal'
import ReviewAction from '@/components/nav-actions/review-action'
import SearchAction from '@/components/nav-actions/search-action'
import { useRegistry } from '@/lib/hooks'

const TMDB_IMG = 'https://image.tmdb.org/t/p'

export function MovieRegistry({
  movie,
  runtimeText,
  year,
  isLoading = false,
  reviewState,
}) {
  const [isSearching, setIsSearching] = useState(false)

  useRegistry({
    nav: {
      title:
        movie?.title || movie?.original_title || (isLoading ? '' : undefined),
      description: (
        <span className="flex items-center gap-1.5 text-white/60">
          {year && <span>{year}</span>}
          {year && runtimeText && <span>•</span>}
          {runtimeText && <span>{runtimeText}</span>}
        </span>
      ),
      icon: movie?.poster_path
        ? `${TMDB_IMG}/original${movie.poster_path}`
        : undefined,
      isLoading,
      actions: [
        {
          key: 'search-overlay',
          tooltip: "Search",
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
      ) : undefined,
    },
    background: {
      overlay: true,
      overlayOpacity: 0.7,
      noiseStyle: {
        opacity: 0.5,
      },
      image: movie?.backdrop_path
        ? `${TMDB_IMG}/original${movie.backdrop_path}`
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
