'use client';

import { Fragment, useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import CastModal from '@/features/modal/cast-modal';
import ImagePreviewModal from '@/features/modal/image-preview-modal';
import ListPickerModal from '@/features/modal/list-picker-modal';
import ReviewEditorModal from '@/features/modal/review-editor-modal';
import VideoPreviewModal from '@/features/modal/video-preview-modal';
import ReviewAction from '@/features/navigation/actions/review-action';
import SearchAction from '@/features/navigation/actions/search-action';
import MovieAction from '@/features/navigation/actions/movie-action';
import WatchProvidersSurface from '@/features/navigation/surfaces/watch-providers-surface';
import { REVIEW_SORT_MODE, parseReviewSortMode } from '@/features/reviews/utils';
import { getNavActionClass } from '@/core/modules/nav/actions/styles';
import { EASING, TMDB_IMG } from '@/core/constants';
import { useRegistry } from '@/core/modules/registry';
import Icon from '@/ui/icon/index';
import MediaSocialProofModal from '@/features/modal/media-social-proof-modal';
import {
  createMovieBackgroundContextMenuItems,
  createMoviePosterContextMenuItems,
} from '@/features/movie/context-menu-actions';

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

const MOVIE_BACKDROP_CONTEXT_TARGET = '[data-context-menu-target="movie-backdrop-card"]';
const MOVIE_POSTER_CONTEXT_TARGET = '[data-context-menu-target="movie-poster-card"]';

function renderMovieMetaDescription(parts = [], { compact = false } = {}) {
  if (!Array.isArray(parts) || parts.length === 0) {
    return null;
  }

  const iconSize = compact ? 10 : 14;
  const containerClassName = ['flex items-center', compact ? 'gap-1' : 'gap-1.5'].join(' ');
  const ratingClassName = [
    'text-warning inline-flex items-center font-semibold leading-none',
    compact ? 'gap-1 text-[11px]' : 'gap-1.5 text-sm',
  ].join(' ');

  return (
    <span className={containerClassName}>
      {parts.map((part, index) => {
        const key = `${String(part)}-${index}`;

        if (index === 0) {
          return (
            <span key={key} className={ratingClassName}>
              <Icon icon="solar:star-bold" size={iconSize} className="text-warning shrink-0" />
              {part}
            </span>
          );
        }

        return (
          <Fragment key={key}>
            <span aria-hidden="true">•</span>
            <span>{part}</span>
          </Fragment>
        );
      })}
    </span>
  );
}

export default function Registry({
  movie,
  onSetMoviePoster,
  onSetMovieBackground,
  onResetMoviePoster,
  onResetMovieBackground,
  canResetMoviePoster = false,
  canResetMovieBackground = false,
  runtimeText,
  year,
  rating,
  backgroundImage,
  isLoading = false,
  reviewState,
}) {
  const [isSearching, setIsSearching] = useState(false);
  const [isWatchProvidersVisible, setIsWatchProvidersVisible] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isMovieReviewsRoute = /^\/movie\/[^/]+\/reviews$/.test(pathname || '');
  const reviewUserFilter = String(searchParams?.get('user') || '').trim();
  const hasReviewUserFilter = Boolean(reviewUserFilter);
  const activeSortMode = parseReviewSortMode(searchParams?.get('sort'), REVIEW_SORT_MODE.NEWEST);

  useEffect(() => {
    if (!reviewState?.isActive && !isSearching) {
      return;
    }

    setIsWatchProvidersVisible(false);
  }, [reviewState?.isActive, isSearching]);

  const metaDescriptionParts = [rating, year, runtimeText].filter(Boolean);
  const navDescription = renderMovieMetaDescription(metaDescriptionParts);
  const contextMenuDescription = renderMovieMetaDescription(metaDescriptionParts, {
    compact: true,
  });
  const resolvedBackgroundImage =
    backgroundImage || (movie?.backdrop_path ? `${TMDB_IMG}/original${movie.backdrop_path}` : undefined);
  const shouldResetBackgroundForLoading = isLoading && !resolvedBackgroundImage;

  const navSurface =
    !isMovieReviewsRoute && !reviewState?.isActive && !isSearching && isWatchProvidersVisible ? (
      <WatchProvidersSurface providers={movie?.['watch/providers']} videos={movie?.videos} />
    ) : undefined;

  const handleSortChange = (nextSortMode) => {
    const params = new URLSearchParams(searchParams?.toString() || '');
    const resolvedSortMode = parseReviewSortMode(nextSortMode, REVIEW_SORT_MODE.NEWEST);

    if (resolvedSortMode === REVIEW_SORT_MODE.NEWEST) {
      params.delete('sort');
    } else {
      params.set('sort', resolvedSortMode);
    }

    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const handleShowAllReviews = () => {
    const params = new URLSearchParams(searchParams?.toString() || '');
    params.delete('user');

    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const navAction = reviewState?.isActive ? (
    <ReviewAction reviewState={reviewState} />
  ) : isSearching ? (
    <SearchAction />
  ) : isMovieReviewsRoute && hasReviewUserFilter ? (
    <div className="mt-2.5 flex w-full gap-2">
      <button
        type="button"
        onClick={handleShowAllReviews}
        className={getNavActionClass({
          className: 'flex-1',
          isActive: false,
        })}
      >
        <Icon icon="solar:list-bold" size={16} />
        Show All Reviews
      </button>
    </div>
  ) : (
    <div className="mt-2.5 flex w-full gap-2">
      <MovieAction
        mode={isMovieReviewsRoute ? 'sort' : 'watch'}
        isActive={isWatchProvidersVisible}
        onToggle={() => setIsWatchProvidersVisible((value) => !value)}
        sortMode={activeSortMode}
        onSortChange={handleSortChange}
      />
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
      contextMenuDescription: contextMenuDescription || undefined,
      description: navDescription || undefined,
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
    ...(typeof onSetMovieBackground === 'function' ||
    typeof onSetMoviePoster === 'function' ||
    typeof onResetMovieBackground === 'function' ||
    typeof onResetMoviePoster === 'function'
      ? {
          contextMenu: {
            menus: [
              ...(typeof onSetMovieBackground === 'function' || typeof onResetMovieBackground === 'function'
                ? [
                    {
                      key: 'movie-backdrop-context-menu',
                      target: MOVIE_BACKDROP_CONTEXT_TARGET,
                      priority: 220,
                      resolveContext: (_event, context) => {
                        const target = context?.target;
                        const backdropCard =
                          target && typeof target.closest === 'function'
                            ? target.closest(MOVIE_BACKDROP_CONTEXT_TARGET)
                            : null;
                        const filePath = backdropCard?.getAttribute('data-backdrop-file-path') || null;

                        return {
                          payload: {
                            filePath,
                            movieId: movie?.id || null,
                          },
                        };
                      },
                      items: (menuContext) => {
                        const filePath = menuContext?.payload?.filePath;

                        return createMovieBackgroundContextMenuItems({
                          filePath,
                          onSetMovieBackground,
                          onResetMovieBackground,
                          canResetBackground: canResetMovieBackground,
                        });
                      },
                    },
                  ]
                : []),
              ...(typeof onSetMoviePoster === 'function' || typeof onResetMoviePoster === 'function'
                ? [
                    {
                      key: 'movie-poster-context-menu',
                      target: MOVIE_POSTER_CONTEXT_TARGET,
                      priority: 225,
                      resolveContext: (_event, context) => {
                        const target = context?.target;
                        const posterCard =
                          target && typeof target.closest === 'function'
                            ? target.closest(MOVIE_POSTER_CONTEXT_TARGET)
                            : null;
                        const filePath = posterCard?.getAttribute('data-poster-file-path') || null;

                        return {
                          payload: {
                            filePath,
                            movieId: movie?.id || null,
                          },
                        };
                      },
                      items: (menuContext) => {
                        const filePath = menuContext?.payload?.filePath;

                        return createMoviePosterContextMenuItems({
                          filePath,
                          onSetMoviePoster,
                          onResetMoviePoster,
                          canResetPoster: canResetMoviePoster,
                        });
                      },
                    },
                  ]
                : []),
            ],
          },
        }
      : {}),
    loading: { isLoading },
    modal: {
      CAST_MODAL: CastModal,
      LIST_PICKER_MODAL: ListPickerModal,
      MEDIA_SOCIAL_PROOF_MODAL: MediaSocialProofModal,
      PREVIEW_MODAL: ImagePreviewModal,
      REVIEW_EDITOR_MODAL: ReviewEditorModal,
      VIDEO_PREVIEW_MODAL: VideoPreviewModal,
    },
  });

  return null;
}
