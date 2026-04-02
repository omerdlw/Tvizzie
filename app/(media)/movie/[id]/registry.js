'use client'

import { Fragment, useEffect, useState } from 'react'

import ImagePreviewModal from '@/features/modal/image-preview-modal'
import ListPickerModal from '@/features/modal/list-picker-modal'
import ReviewEditorModal from '@/features/modal/review-editor-modal'
import VideoPreviewModal from '@/features/modal/video-preview-modal'
import ReviewAction from '@/features/navigation/actions/review-action'
import SearchAction from '@/features/navigation/actions/search-action'
import WatchProvidersAction from '@/features/navigation/actions/watch-providers-action'
import WatchProvidersMask from '@/features/navigation/masks/watch-providers-mask'
import { DURATION, EASING, TMDB_IMG } from '@/lib/constants'
import { useRegistry } from '@/modules/registry'
import Icon from '@/ui/icon/index'

export default function Registry({
  movie,
  runtimeText,
  year,
  rating,
  backgroundImage,
  isLoading = false,
  reviewState,
}) {
  const [isSearching, setIsSearching] = useState(false)
  const [isWatchProvidersVisible, setIsWatchProvidersVisible] = useState(false)

  useEffect(() => {
    if (!reviewState?.isActive && !isSearching) {
      return
    }

    setIsWatchProvidersVisible(false)
  }, [reviewState?.isActive, isSearching])

  const metaDescriptionParts = [rating, year, runtimeText].filter(Boolean)
  const resolvedBackgroundImage =
    backgroundImage ||
    (movie?.backdrop_path ? `${TMDB_IMG}/w1280${movie.backdrop_path}` : undefined)

  const navSurface =
    !reviewState?.isActive && !isSearching && isWatchProvidersVisible ? (
      <WatchProvidersMask
        providers={movie?.['watch/providers']}
        videos={movie?.videos}
      />
    ) : undefined

  const navAction = reviewState?.isActive ? (
    <ReviewAction reviewState={reviewState} />
  ) : isSearching ? (
    <SearchAction />
  ) : (
    <div className="mt-2.5 flex w-full gap-2">
      <WatchProvidersAction
        isActive={isWatchProvidersVisible}
        onToggle={() => setIsWatchProvidersVisible((value) => !value)}
      />
    </div>
      )


  useRegistry({
    nav: {
      action: navAction,
      actions: [
        {
          key: 'search-overlay',
          tooltip: 'Search',
          icon: isSearching
            ? 'material-symbols:close-rounded'
            : 'solar:magnifer-linear',
          order: 30,
          onClick: (event) => {
            event.stopPropagation()
            setIsSearching((value) => !value)
          },
        },
      ],
      confirmation: reviewState?.confirmation || null,
      description:
        metaDescriptionParts.length > 0 ? (
          <span className="flex items-center gap-1.5 text-white/70">
            {metaDescriptionParts.map((part, index) => (
              <Fragment key={`${part}-${index}`}>
                {index > 0 && <span key={`${part}-${index}`} className="text-white/50">•</span>}
                {index === 0 ? <span key={`${part}-${index}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-warning">
                  <Icon
                    key={`${part}-${index}`}
                    icon="solar:star-bold"
                    size={14}
                    className="text-warning"
                  />
                  {part}
                </span> : <span key={index}>{part}</span>}
              </Fragment>
            ))}
          </span>
        ) : undefined,
      icon: movie?.poster_path ? `${TMDB_IMG}/w342${movie.poster_path}` : undefined,
      isLoading,
      surface: navSurface,
      title:
        movie?.title || movie?.original_title || (isLoading ? '' : undefined),
    },
    ...(resolvedBackgroundImage
      ? {
          background: {
            animation: {
              transition: {
                duration: DURATION.HERO,
                ease: EASING.STANDARD,
              },
              initial: {},
              animate: {},
              exit: {},
            },
            image: resolvedBackgroundImage,
          overlay: true,
          overlayOpacity: .5,
          noiseStyle: {
            opacity: .4
            }
          },
        }
      : {}),
    loading: { isLoading },
    modal: {
      LIST_PICKER_MODAL: ListPickerModal,
      PREVIEW_MODAL: ImagePreviewModal,
      REVIEW_EDITOR_MODAL: ReviewEditorModal,
      VIDEO_PREVIEW_MODAL: VideoPreviewModal,
    },
  })

  return null
}
