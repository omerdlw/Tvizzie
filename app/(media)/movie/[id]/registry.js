'use client';

import { Fragment, useEffect, useState } from 'react';

import ImagePreviewModal from '@/features/modal/image-preview-modal';
import ListPickerModal from '@/features/modal/list-picker-modal';
import ReviewEditorModal from '@/features/modal/review-editor-modal';
import VideoPreviewModal from '@/features/modal/video-preview-modal';
import ReviewAction from '@/features/navigation/actions/review-action';
import SearchAction from '@/features/navigation/actions/search-action';
import MovieAction from '@/features/navigation/actions/movie-action';
import WatchProvidersSurface from '@/features/navigation/surfaces/watch-providers-surface';
import { EASING, TMDB_IMG } from '@/core/constants';
import { useRegistry } from '@/core/modules/registry';
import Icon from '@/ui/icon/index';
import MediaSocialProofModal from '@/features/modal/media-social-proof-modal';

const MOVIE_BACKGROUND_ANIMATION = Object.freeze({
  exitDurationFactor: 0.4,
  transition: {
    duration: 1.2,
    delay: 0.4,
    ease: EASING.EMPHASIZED,
  },
  initial: {
    opacity: 0,
    scale: 1.12,
  },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transitionEnd: {
      transform: 'none',
      willChange: 'auto',
    },
  },
  exit: {
    opacity: 0,
    scale: 1.05,
  },
});

export default function Registry({
  movie,
  runtimeText,
  year,
  rating,
  backgroundImage,
  isLoading = false,
  reviewState,
}) {
  const [isSearching, setIsSearching] = useState(false);
  const [isWatchProvidersVisible, setIsWatchProvidersVisible] = useState(false);

  useEffect(() => {
    if (!reviewState?.isActive && !isSearching) {
      return;
    }

    setIsWatchProvidersVisible(false);
  }, [reviewState?.isActive, isSearching]);

  const metaDescriptionParts = [rating, year, runtimeText].filter(Boolean);
  const resolvedBackgroundImage =
    backgroundImage || (movie?.backdrop_path ? `${TMDB_IMG}/original${movie.backdrop_path}` : undefined);
  const shouldResetBackgroundForLoading = isLoading && !resolvedBackgroundImage;

  const navSurface =
    !reviewState?.isActive && !isSearching && isWatchProvidersVisible ? (
      <WatchProvidersSurface providers={movie?.['watch/providers']} videos={movie?.videos} />
    ) : undefined;

  const navAction = reviewState?.isActive ? (
    <ReviewAction reviewState={reviewState} />
  ) : isSearching ? (
    <SearchAction />
  ) : (
    <div className="mt-2.5 flex w-full gap-2">
      <MovieAction isActive={isWatchProvidersVisible} onToggle={() => setIsWatchProvidersVisible((value) => !value)} />
    </div>
  );

  useRegistry({
    nav: {
      action: navAction,
      actions: [
        {
          key: 'search-overlay',
          tooltip: 'Search',
          icon: isSearching ? 'material-symbols:close-rounded' : 'solar:magnifer-linear',
          order: 30,
          onClick: (event) => {
            event.stopPropagation();
            setIsSearching((value) => !value);
          },
        },
      ],
      confirmation: reviewState?.confirmation || null,
      description:
        metaDescriptionParts.length > 0 ? (
          <span className="flex items-center gap-1.5">
            {metaDescriptionParts.map((part, index) => (
              <Fragment key={`${part}-${index}`}>
                {index > 0 && <span key={`${part}-${index}`}>•</span>}
                {index === 0 ? (
                  <span
                    key={`${part}-${index}`}
                    className="text-warning inline-flex items-center gap-1.5 text-sm font-semibold"
                  >
                    <Icon key={`${part}-${index}`} icon="solar:star-bold" size={14} className="text-warning" />
                    {part}
                  </span>
                ) : (
                  <span key={index}>{part}</span>
                )}
              </Fragment>
            ))}
          </span>
        ) : undefined,
      icon: movie?.poster_path ? `${TMDB_IMG}/w342${movie.poster_path}` : undefined,
      surface: navSurface,
      title: movie?.title || movie?.original_title || (isLoading ? '' : undefined),
    },
    ...(resolvedBackgroundImage || shouldResetBackgroundForLoading
      ? {
          background: resolvedBackgroundImage
            ? {
                animation: MOVIE_BACKGROUND_ANIMATION,
                image: resolvedBackgroundImage,
                overlay: true,
                overlayOpacity: 0.3,
                overlayColor: '#faf9f5',
                noiseStyle: {
                  opacity: 0.13,
                },
              }
            : {
                image: null,
                video: null,
                overlay: false,
                overlayOpacity: 0,
                noiseStyle: {
                  opacity: 0,
                },
              },
        }
      : {}),
    loading: { isLoading },
    modal: {
      LIST_PICKER_MODAL: ListPickerModal,
      MEDIA_SOCIAL_PROOF_MODAL: MediaSocialProofModal,
      PREVIEW_MODAL: ImagePreviewModal,
      REVIEW_EDITOR_MODAL: ReviewEditorModal,
      VIDEO_PREVIEW_MODAL: VideoPreviewModal,
    },
  });

  return null;
}
