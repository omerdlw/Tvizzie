'use client';

import { Fragment, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

const CastModal = dynamic(() => import('@/domains/shell/modals/cast-modal'), { ssr: false });
const ImagePreviewModal = dynamic(() => import('@/domains/shell/modals/image-preview-modal'), {
  ssr: false,
});
const VideoPreviewModal = dynamic(() => import('@/domains/shell/modals/video-preview-modal'), {
  ssr: false,
});
const MediaSocialProofModal = dynamic(() => import('@/domains/shell/modals/social-proof-modal'), {
  ssr: false,
});

import ReviewAction from '@/domains/shell/navigation/actions/review-action';
import SearchAction from '@/domains/shell/navigation/actions/search-action';
import MovieAction from '@/domains/shell/navigation/actions/movie-action';
import PersonAction from '@/domains/shell/navigation/actions/person-action';
import WatchProvidersSurface from '@/domains/shell/navigation/surfaces/watch-providers-surface';
import ReviewEditorSurface, {
  createReviewEditorSurfaceEntry,
} from '@/domains/shell/navigation/surfaces/review-editor-surface';
import { REVIEW_SORT_MODE } from '@/domains/reviews/utils/constants';
import { parseReviewSortMode } from '@/domains/reviews/utils/formatting';
import { getNavActionClass } from '@/modules/nav/action-styles';
import { TMDB_IMG } from '@/shared/constants';
import { useRegistry } from '@/modules/registry';
import { useNavigationActions, useNavigationState } from '@/modules/nav';
import { useAuth } from '@/modules/auth';
import Icon from '@/ui/primitives/icon';
import {
  createMovieBackgroundContextMenuItems,
  createMoviePosterContextMenuItems,
} from '@/domains/media/ui/components/context-menu-actions';

const MOVIE_BACKDROP_CONTEXT_TARGET = '[data-context-menu-target="movie-backdrop-card"]';
const MOVIE_POSTER_CONTEXT_TARGET = '[data-context-menu-target="movie-poster-card"]';
const PERSON_POSTER_CONTEXT_TARGET = '[data-context-menu-target="person-poster-card"]';

function getMediaTitle(item = {}) {
  return item?.title || item?.original_title || item?.name || item?.original_name;
}

function getTvAirDates(tv = {}) {
  const firstYear = tv?.first_air_date ? String(tv.first_air_date).slice(0, 4) : null;
  const lastYear = tv?.last_air_date ? String(tv.last_air_date).slice(0, 4) : null;

  if (!firstYear) return null;

  const isEnded = tv?.status === 'Ended' || tv?.status === 'Canceled';

  if (isEnded && lastYear && lastYear !== firstYear) {
    return `${firstYear}–${lastYear}`;
  }
  if (isEnded) {
    return firstYear;
  }
  if (lastYear && lastYear !== firstYear) {
    return `${firstYear}–${lastYear}`;
  }
  return `${firstYear}–`;
}

function renderMetaDescription(parts = [], { compact = false } = {}) {
  if (!Array.isArray(parts) || parts.length === 0) {
    return null;
  }

  const containerClassName = ['flex items-center', compact ? 'gap-1' : 'gap-1.5'].join(' ');

  return (
    <span className={containerClassName}>
      {parts.map((part, index) => {
        const key = `${String(part)}-${index}`;

        return (
          <Fragment key={key}>
            {index > 0 && <span aria-hidden="true">•</span>}
            <span>{part}</span>
          </Fragment>
        );
      })}
    </span>
  );
}

function getPersonNavDescription(person, age) {
  const ageLabel =
    age !== null && age !== undefined
      ? `${age}${person?.deathday ? ' years lived' : ' years old'}`
      : null;

  return [person?.known_for_department, ageLabel].filter(Boolean).join(' • ');
}

export default function MediaRegistry({
  movie,
  onSetMoviePoster,
  onSetMovieBackground,
  onResetMoviePoster,
  onResetMovieBackground,
  canResetMoviePoster = false,
  canResetMovieBackground = false,
  runtimeText,
  year,
  backgroundImage,
  isLoading = false,
  mediaType = 'movie',
  reviewState,

  person,
  activeView,
  setActiveView,
  age,
  onSetPersonPoster,
  onResetPersonPoster,
  canResetPersonPoster = false,
}) {
  const isPerson = mediaType === 'person' || Boolean(person && !movie);
  const auth = useAuth();
  const isAuthenticated = auth?.isAuthenticated;
  const user = auth?.user;

  const { openSurface, closeSurface } = useNavigationActions();
  const { activeSurfaceEntry } = useNavigationState();
  const [isSearching, setIsSearching] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  if (isPerson) {
    const title = person?.name || (isLoading ? '' : undefined);
    const description = getPersonNavDescription(person, age) || undefined;
    const icon = person?.profile_path ? `${TMDB_IMG}/original${person.profile_path}` : undefined;
    const shouldResetBackgroundForLoading = isLoading && !backgroundImage;

    useRegistry({
      nav: {
        title,
        description: isLoading ? undefined : description,
        icon,
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
        action: isSearching ? (
          <SearchAction />
        ) : person ? (
          <PersonAction
            activeView={activeView}
            setActiveView={setActiveView}
            externalIds={person.external_ids}
          />
        ) : undefined,
      },
      ...(backgroundImage || shouldResetBackgroundForLoading
        ? {
            background: backgroundImage
              ? {
                  image: backgroundImage,
                  noiseStyle: {
                    opacity: 0.1,
                  },
                }
              : {
                  image: null,
                  video: null,
                  overlay: false,
                },
          }
        : {}),
      ...(typeof onSetPersonPoster === 'function' || typeof onResetPersonPoster === 'function'
        ? {
            contextMenu: {
              menus: [
                {
                  key: 'person-poster-context-menu',
                  target: PERSON_POSTER_CONTEXT_TARGET,
                  priority: 225,
                  resolveContext: (_event, context) => {
                    const target = context?.target;
                    const posterCard =
                      target && typeof target.closest === 'function'
                        ? target.closest(PERSON_POSTER_CONTEXT_TARGET)
                        : null;
                    const filePath = posterCard?.getAttribute('data-poster-file-path') || null;

                    return {
                      payload: {
                        filePath,
                        personId: person?.id || null,
                      },
                    };
                  },
                  items: (menuContext) => {
                    const filePath = menuContext?.payload?.filePath;

                    return createMoviePosterContextMenuItems({
                      filePath,
                      onSetMoviePoster: onSetPersonPoster,
                      onResetMoviePoster: onResetPersonPoster,
                      canResetPoster: canResetPersonPoster,
                    });
                  },
                },
              ],
            },
          }
        : {}),
      loading: { isLoading, showOverlay: false },
      modal: {
        PREVIEW_MODAL: ImagePreviewModal,
      },
    });

    return null;
  }

  const isMediaReviewsRoute = new RegExp(`^/${mediaType}/[^/]+/reviews$`).test(pathname || '');
  const reviewUserFilter = String(searchParams?.get('user') || '').trim();
  const hasReviewUserFilter = Boolean(reviewUserFilter);
  const activeSortMode = parseReviewSortMode(searchParams?.get('sort'), REVIEW_SORT_MODE.NEWEST);
  const isWatchProvidersVisible = activeSurfaceEntry?.component === WatchProvidersSurface;
  const isReviewEditorVisible = activeSurfaceEntry?.component === ReviewEditorSurface;

  useEffect(() => {
    if (!reviewState?.isActive && !isSearching) {
      return;
    }

    if (
      activeSurfaceEntry?.component === WatchProvidersSurface ||
      activeSurfaceEntry?.component === ReviewEditorSurface
    ) {
      closeSurface();
    }
  }, [reviewState?.isActive, isSearching, activeSurfaceEntry, closeSurface]);

  let detailMetaParts = [];
  if (mediaType === 'tv') {
    const airDates = getTvAirDates(movie);
    const seasonCountText = movie?.number_of_seasons
      ? `${movie.number_of_seasons} ${movie.number_of_seasons === 1 ? 'Season' : 'Seasons'}`
      : null;
    const episodeCountText = movie?.number_of_episodes
      ? `${movie.number_of_episodes} ${movie.number_of_episodes === 1 ? 'Episode' : 'Episodes'}`
      : null;
    detailMetaParts = [airDates, seasonCountText, episodeCountText].filter(Boolean);
  } else {
    detailMetaParts = [year, runtimeText].filter(Boolean);
  }

  const navDescription = renderMetaDescription(detailMetaParts);
  const contextMenuDescription = renderMetaDescription(detailMetaParts, { compact: true });

  const resolvedBackgroundImage =
    backgroundImage ||
    (movie?.backdrop_path ? `${TMDB_IMG}/original${movie.backdrop_path}` : undefined);
  const shouldResetBackgroundForLoading = isLoading && !resolvedBackgroundImage;

  const handleToggleAction = () => {
    if (isAuthenticated) {
      if (isReviewEditorVisible) {
        closeSurface();
      } else {
        const targetReview =
          typeof reviewState?.ownReview === 'object' && reviewState.ownReview !== null
            ? reviewState.ownReview
            : null;
        openSurface(
          createReviewEditorSurfaceEntry({
            media: {
              entityId: movie?.id,
              entityType: mediaType,
              posterPath: movie?.poster_path,
              title: getMediaTitle(movie),
            },
            onSuccess: reviewState?.applyOptimisticReviewUpdate,
            review: targetReview,
            user: user
              ? {
                  ...(targetReview?.user || {}),
                  ...user,
                  id: user.id,
                }
              : targetReview?.user || null,
          }),
        );
      }
    } else {
      if (isWatchProvidersVisible) {
        closeSurface();
      } else {
        openSurface(WatchProvidersSurface, {
          providers: movie?.['watch/providers'],
        });
      }
    }
  };

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
  ) : isMediaReviewsRoute && hasReviewUserFilter ? (
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
        mode={isMediaReviewsRoute ? 'sort' : 'watch'}
        isActive={isAuthenticated ? isReviewEditorVisible : isWatchProvidersVisible}
        isAuthenticated={isAuthenticated}
        hasExistingReview={Boolean(reviewState?.ownReview)}
        onToggle={handleToggleAction}
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
      contextMenuDescription: contextMenuDescription || undefined,
      description: navDescription || undefined,
      icon: movie?.poster_path ? `${TMDB_IMG}/original${movie.poster_path}` : undefined,
      title: getMediaTitle(movie) || (isLoading ? '' : undefined),
    },
    ...(resolvedBackgroundImage || shouldResetBackgroundForLoading
      ? {
          background: resolvedBackgroundImage
            ? {
                image: resolvedBackgroundImage,
                noiseStyle: {
                  opacity: 0.1,
                },
              }
            : {
                image: null,
                video: null,
                overlay: false,
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
              ...(typeof onSetMovieBackground === 'function' ||
              typeof onResetMovieBackground === 'function'
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
                        const filePath =
                          backdropCard?.getAttribute('data-backdrop-file-path') || null;

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
    loading: { isLoading, showOverlay: false },
    modal: {
      CAST_MODAL: CastModal,
      MEDIA_SOCIAL_PROOF_MODAL: MediaSocialProofModal,
      PREVIEW_MODAL: ImagePreviewModal,
      VIDEO_PREVIEW_MODAL: VideoPreviewModal,
    },
  });

  return null;
}
