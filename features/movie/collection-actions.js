'use client';

import { useEffect, useMemo, useState } from 'react';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { AUTH_ROUTES } from '@/features/auth/constants';
import { buildAuthHref, getCurrentPathWithSearch } from '@/features/auth/utils';
import { resolveExplicitMediaType } from '@/core/utils/media';
import { cn } from '@/core/utils';
import { useAuth, useAuthSessionReady } from '@/core/modules/auth';
import { useModal } from '@/core/modules/modal/context';
import { useToast } from '@/core/modules/notification/hooks';
import {
  ensureLegacyFavoritesBackfilled,
  subscribeToLikeStatus,
  toggleUserLike,
} from '@/core/services/media/likes.service';
import {
  markUserWatched,
  removeUserWatchedItem,
  subscribeToWatchedStatus,
} from '@/core/services/media/watched.service';
import { subscribeToWatchlistStatus, toggleUserWatchlistItem } from '@/core/services/media/watchlist.service';
import Icon from '@/ui/icon';

function getMediaSnapshot(media) {
  const normalizedGenres = Array.isArray(media?.genres)
    ? media.genres
        .map((genre) => {
          if (!genre) {
            return null;
          }

          if (typeof genre === 'object') {
            return {
              id: genre.id ?? null,
              name: genre.name || null,
            };
          }

          return {
            id: null,
            name: String(genre),
          };
        })
        .filter(Boolean)
    : [];

  const genreIds = Array.isArray(media?.genre_ids)
    ? media.genre_ids
    : normalizedGenres
        .map((genre) => genre.id)
        .filter((value) => Number.isFinite(Number(value)))
        .map((value) => Number(value));

  const watchProviders =
    media?.watchProviders && typeof media.watchProviders === 'object' ? media.watchProviders : null;

  return {
    entityId: media?.id,
    entityType: resolveExplicitMediaType(media, 'movie'),
    title: media?.title || media?.original_title || 'Untitled',
    posterPath: media?.poster_path || media?.posterPath || null,
    backdropPath: media?.backdrop_path || media?.backdropPath || null,
    release_date: media?.release_date || null,
    first_air_date: null,
    genreNames: normalizedGenres.map((genre) => genre.name).filter(Boolean),
    genre_ids: genreIds,
    genres: normalizedGenres,
    name: '',
    popularity: Number.isFinite(Number(media?.popularity)) ? Number(media.popularity) : null,
    providerIds: [],
    providerNames: [],
    providers: [],
    runtime: Number.isFinite(Number(media?.runtime)) ? Number(media.runtime) : null,
    vote_average: media?.vote_average ?? null,
    vote_count: Number.isFinite(Number(media?.vote_count)) ? Number(media.vote_count) : null,
    watchProviders,
  };
}

function getActionPalette(palette, active) {
  if (!active) {
    return 'border border-black/10 bg-primary/40 hover:border-black/20 hover:bg-primary/80 text-black/70 hover:text-black';
  }

  if (palette === 'like') {
    return 'border border-success/20 bg-success/20 text-success hover:border-success/10 hover:bg-success/10';
  }

  if (palette === 'watched' || palette === 'watchlist') {
    return 'border border-info/20 bg-info/20 text-info hover:border-info/10 hover:bg-info/10';
  }

  return 'border border-black/10 bg-primary/40 hover:border-black/20 hover:bg-primary/80';
}

function ActionButton({
  active = false,
  disabled = false,
  icon,
  label,
  loading = false,
  loadingLabel = 'Loading',
  onClick,
  palette,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'group center w-full gap-2 rounded-[14px] px-4 py-3 text-xs font-bold tracking-wide uppercase backdrop-blur-xs transition-all duration-300 disabled:cursor-not-allowed lg:py-3.5',
        getActionPalette(palette, active)
      )}
    >
      {loading ? (
        <span>{loadingLabel}</span>
      ) : (
        <>
          <Icon icon={icon} size={16} className="transition-transform" />
          <span>{label}</span>
        </>
      )}
    </button>
  );
}

export default function CollectionActions({ media }) {
  const auth = useAuth();
  const toast = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { openModal } = useModal();

  const userId = auth.user?.id || null;
  const isSessionReady = useAuthSessionReady(auth.isAuthenticated ? userId : null);

  const currentPath = useMemo(() => getCurrentPathWithSearch(pathname, searchParams), [pathname, searchParams]);
  const isMovieReviewsRoute = /^\/movie\/[^/]+\/reviews$/.test(pathname || '');

  const mediaSnapshot = useMemo(() => getMediaSnapshot(media), [media]);

  const [state, setState] = useState({
    liked: false,
    watchlist: false,
    watched: false,
    loadingLike: true,
    loadingWatchlist: true,
    loadingWatched: true,
    submittingLike: false,
    submittingWatchlist: false,
    submittingWatched: false,
    likeIntent: null,
    watchlistIntent: null,
    watchedIntent: null,
  });

  useEffect(() => {
    if (!auth.isReady || (userId && !isSessionReady)) {
      setState((prev) => ({
        ...prev,
        loadingLike: true,
        loadingWatchlist: true,
        loadingWatched: true,
      }));
      return;
    }

    if (!userId) {
      setState((prev) => ({
        ...prev,
        liked: false,
        watchlist: false,
        watched: false,
        loadingLike: false,
        loadingWatchlist: false,
        loadingWatched: false,
      }));
      return;
    }

    let active = true;
    let unsubLike = () => {};
    let unsubWatchlist = () => {};
    let unsubWatched = () => {};

    setState((prev) => ({
      ...prev,
      loadingLike: true,
      loadingWatchlist: true,
      loadingWatched: true,
    }));

    async function init() {
      await ensureLegacyFavoritesBackfilled(userId);

      if (!active) {
        return;
      }

      unsubLike = subscribeToLikeStatus(
        { media: mediaSnapshot, userId },
        (liked) => {
          setState((prev) => ({ ...prev, liked, loadingLike: false }));
        },
        { onError: () => setState((prev) => ({ ...prev, loadingLike: false })) }
      );

      unsubWatchlist = subscribeToWatchlistStatus(
        { media: mediaSnapshot, userId },
        (watchlist) => {
          setState((prev) => ({ ...prev, watchlist, loadingWatchlist: false }));
        },
        { onError: () => setState((prev) => ({ ...prev, loadingWatchlist: false })) }
      );

      unsubWatched = subscribeToWatchedStatus(
        { media: mediaSnapshot, userId },
        (watched) => {
          setState((prev) => ({ ...prev, watched, loadingWatched: false }));
        },
        { onError: () => setState((prev) => ({ ...prev, loadingWatched: false })) }
      );
    }

    init().catch(() => {
      if (!active) {
        return;
      }

      setState((prev) => ({
        ...prev,
        loadingLike: false,
        loadingWatchlist: false,
        loadingWatched: false,
      }));
    });

    return () => {
      active = false;
      unsubLike();
      unsubWatchlist();
      unsubWatched();
    };
  }, [auth.isReady, isSessionReady, mediaSnapshot, userId]);

  async function ensureSignedIn() {
    if (auth.isAuthenticated && userId) {
      return userId;
    }

    router.push(
      buildAuthHref(AUTH_ROUTES.SIGN_IN, {
        next: currentPath,
      })
    );

    return null;
  }

  async function handleLikeClick() {
    if (state.submittingLike) {
      return;
    }

    const resolvedUserId = await ensureSignedIn();
    if (!resolvedUserId) {
      return;
    }

    const intent = state.liked ? 'remove' : 'add';

    setState((prev) => ({
      ...prev,
      submittingLike: true,
      likeIntent: intent,
    }));

    try {
      const result = await toggleUserLike({ media: mediaSnapshot, userId: resolvedUserId });

      setState((prev) => ({
        ...prev,
        liked: result.isLiked,
      }));
    } catch (error) {
      toast.error(error?.message || 'Like could not be updated');
    } finally {
      setState((prev) => ({
        ...prev,
        submittingLike: false,
        likeIntent: null,
      }));
    }
  }

  async function handleWatchlistClick() {
    if (state.submittingWatchlist) {
      return;
    }

    const resolvedUserId = await ensureSignedIn();
    if (!resolvedUserId) {
      return;
    }

    const intent = state.watchlist ? 'remove' : 'add';

    setState((prev) => ({
      ...prev,
      submittingWatchlist: true,
      watchlistIntent: intent,
    }));

    try {
      const result = await toggleUserWatchlistItem({ media: mediaSnapshot, userId: resolvedUserId });

      setState((prev) => ({
        ...prev,
        watchlist: result.isInWatchlist,
      }));
    } catch (error) {
      toast.error(error?.message || 'Watchlist could not be updated');
    } finally {
      setState((prev) => ({
        ...prev,
        submittingWatchlist: false,
        watchlistIntent: null,
      }));
    }
  }

  async function handleWatchedClick() {
    if (state.submittingWatched) {
      return;
    }

    const resolvedUserId = await ensureSignedIn();
    if (!resolvedUserId) {
      return;
    }

    const intent = state.watched ? 'remove' : 'add';

    setState((prev) => ({
      ...prev,
      submittingWatched: true,
      watchedIntent: intent,
    }));

    try {
      if (state.watched) {
        await removeUserWatchedItem({ media: mediaSnapshot, userId: resolvedUserId });

        setState((prev) => ({
          ...prev,
          watched: false,
        }));
      } else {
        const result = await markUserWatched({ media: mediaSnapshot, userId: resolvedUserId });

        setState((prev) => ({
          ...prev,
          watched: true,
          watchlist: result.wasRemovedFromWatchlist ? false : prev.watchlist,
        }));
      }
    } catch (error) {
      toast.error(error?.message || 'Watched state could not be updated');
    } finally {
      setState((prev) => ({
        ...prev,
        submittingWatched: false,
        watchedIntent: null,
      }));
    }
  }

  async function handleOpenListPicker() {
    const resolvedUserId = await ensureSignedIn();
    if (!resolvedUserId) {
      return;
    }

    openModal('LIST_PICKER_MODAL', 'center', {
      data: {
        media: mediaSnapshot,
        userId: resolvedUserId,
      },
    });
  }

  const showLikeAction = state.watched;
  const showWatchlistAction = !state.watched;
  const canGoToMovie = Boolean(mediaSnapshot?.entityId) && isMovieReviewsRoute;

  function handleGoToMovie() {
    if (!mediaSnapshot?.entityId) {
      return;
    }

    router.push(`/movie/${mediaSnapshot.entityId}`);
  }

  return (
    <div className="flex flex-col gap-2">
      {canGoToMovie ? (
        <ActionButton
          icon="solar:clapperboard-play-bold"
          label="Go to Movie"
          onClick={handleGoToMovie}
          palette="neutral"
        />
      ) : null}

      {showLikeAction ? (
        <ActionButton
          active={state.liked}
          disabled={state.loadingLike || state.submittingLike}
          icon={state.liked ? 'solar:heart-bold' : 'solar:heart-linear'}
          label={state.liked ? 'Liked' : 'Like'}
          loading={state.loadingLike || state.submittingLike}
          loadingLabel={state.loadingLike ? 'Checking' : state.likeIntent === 'remove' ? 'Removing' : 'Adding'}
          onClick={handleLikeClick}
          palette="like"
        />
      ) : null}

      <div className={cn('grid grid-cols-1 gap-2', showWatchlistAction ? 'min-[460px]:grid-cols-2' : '')}>
        <ActionButton
          active={state.watched}
          disabled={state.loadingWatched || state.submittingWatched}
          icon={state.watched ? 'solar:eye-bold' : 'solar:eye-linear'}
          label={state.watched ? 'Unwatch' : 'Mark Watched'}
          loading={state.loadingWatched || state.submittingWatched}
          loadingLabel={state.loadingWatched ? 'Checking' : state.watchedIntent === 'remove' ? 'Removing' : 'Saving'}
          onClick={handleWatchedClick}
          palette="watched"
        />

        {showWatchlistAction ? (
          <ActionButton
            active={state.watchlist}
            disabled={state.loadingWatchlist || state.submittingWatchlist}
            icon={state.watchlist ? 'solar:bookmark-bold' : 'solar:bookmark-linear'}
            label={state.watchlist ? 'In Watchlist' : 'Watchlist'}
            loading={state.loadingWatchlist || state.submittingWatchlist}
            loadingLabel={
              state.loadingWatchlist ? 'Checking' : state.watchlistIntent === 'remove' ? 'Removing' : 'Adding'
            }
            onClick={handleWatchlistClick}
            palette="watchlist"
          />
        ) : null}
      </div>

      <ActionButton icon="solar:list-broken" label="Add To List" onClick={handleOpenListPicker} palette="neutral" />
    </div>
  );
}
