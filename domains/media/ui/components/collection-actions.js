'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { useAuth, useAuthSessionReady } from '@/modules/auth';
import { useModal } from '@/modules/modal';
import { useToast } from '@/modules/notification';
import { subscribeToLikeStatus, toggleUserLike } from '@/domains/media/client/collections/likes';
import {
  markUserWatched,
  removeUserWatchedItem,
  subscribeToWatchedStatus,
  subscribeToWatchlistStatus,
  toggleUserWatchlistItem,
} from '@/domains/media/client/collections/watched-watchlist';
import { cn } from '@/shared/utils';
import { getMediaDetailPath, getMediaTitle, resolveExplicitMediaType } from '@/domains/media/utils';
import { AUTH_ROUTES, buildAuthHref, getCurrentPathWithSearch } from '@/domains/auth/utils';
import { useNavigationActions } from '@/modules/nav';
import { createListPickerSurfaceEntry } from '@/domains/account/ui/nav-surfaces/list-picker-surface';
import WatchProvidersSurface from '@/domains/media/ui/nav-surfaces/watch-providers-surface';
import Icon from '@/ui/primitives/icon';

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
  const watchProviders = media?.watchProviders || media?.['watch/providers'] || null;
  return {
    entityId: media?.id,
    entityType: resolveExplicitMediaType(media, 'movie'),
    title: getMediaTitle(media),
    posterPath: media?.poster_path || media?.posterPath || null,
    backdropPath: media?.backdrop_path || media?.backdropPath || null,
    release_date: media?.release_date || null,
    first_air_date: media?.first_air_date || null,
    genreNames: normalizedGenres.map((genre) => genre.name).filter(Boolean),
    genre_ids: genreIds,
    genres: normalizedGenres,
    name: media?.name || media?.original_name || '',
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

function createCollectionActionState(isLoading = true) {
  return {
    liked: false,
    watched: false,
    watchlist: false,
    loadingLike: isLoading,
    loadingWatched: isLoading,
    loadingWatchlist: isLoading,
    submittingLike: false,
    submittingWatched: false,
    submittingWatchlist: false,
    likeIntent: null,
    watchedIntent: null,
    watchlistIntent: null,
  };
}

function getActionPalette(palette, active) {
  if (!active) {
    return 'border cursor-pointer border-white/5 hover:border-white/10 hover:bg-white/5 text-white/70 hover:text-white';
  }
  if (palette === 'like') {
    return 'border border-success/20 cursor-pointer bg-success/15 text-success hover:border-success/10 hover:bg-success/25';
  }
  if (palette === 'watched' || palette === 'watchlist') {
    return 'border border-info/20 cursor-pointer bg-info/15 text-info hover:border-info/10 hover:bg-info/25';
  }

  return 'border cursor-pointer border-white/10 bg-primary/60 hover:border-white/15 hover:bg-primary/80 text-white/70 hover:text-white';
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
        'group center xs:text-xs h-11 w-full gap-1.5 px-2.5 py-2.5 text-[11px] font-bold tracking-wide uppercase backdrop-blur-sm transition-all duration-300 ease-in-out disabled:cursor-not-allowed sm:h-12 sm:gap-2 sm:px-4',
        getActionPalette(palette, active),
      )}
    >
      {loading ? (
        <span className="truncate">{loadingLabel}</span>
      ) : (
        <>
          <span className="inline-flex shrink-0">
            <Icon icon={icon} size={16} className="" />
          </span>
          <span className="truncate">{label}</span>
        </>
      )}
    </button>
  );
}

function ActionItem({ children }) {
  return children;
}

export default function CollectionActions({ additionalActions = [], media }) {
  const auth = useAuth();
  const toast = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { openModal } = useModal();
  const { openSurface } = useNavigationActions();
  const userId = auth.user?.id || null;
  const isSessionReady = useAuthSessionReady(auth.isAuthenticated ? userId : null);
  const currentPath = useMemo(
    () => getCurrentPathWithSearch(pathname, searchParams),
    [pathname, searchParams],
  );
  const mediaSnapshot = useMemo(
    () => getMediaSnapshot(media),
    [
      media?.['watch/providers'],
      media?.backdrop_path,
      media?.backdropPath,
      media?.entityId,
      media?.entityType,
      media?.first_air_date,
      media?.genre_ids,
      media?.genres,
      media?.id,
      media?.media_type,
      media?.name,
      media?.original_name,
      media?.original_title,
      media?.popularity,
      media?.poster_path,
      media?.posterPath,
      media?.release_date,
      media?.runtime,
      media?.title,
      media?.vote_average,
      media?.vote_count,
      media?.watchProviders,
    ],
  );
  const isMediaReviewsRoute = Boolean(
    pathname?.endsWith('/reviews') && mediaSnapshot?.entityId && mediaSnapshot?.entityType,
  );
  const [state, setState] = useState(createCollectionActionState);
  // Status polling can briefly return the pre-mutation value while the API
  // write has already succeeded. Keep that stale response from undoing the
  // button's confirmed optimistic state.
  const pendingStatusRef = useRef({ like: null, watchlist: null });

  useEffect(() => {
    if (!mediaSnapshot.entityId) {
      setState(createCollectionActionState(false));
      return undefined;
    }
    if (!auth.isReady) {
      return undefined;
    }
    if (!auth.isAuthenticated) {
      setState(createCollectionActionState(false));
      return undefined;
    }
    if (!isSessionReady || !userId) {
      pendingStatusRef.current = { like: null, watchlist: null };
      setState(createCollectionActionState());
      return undefined;
    }
    let isMounted = true;
    pendingStatusRef.current = { like: null, watchlist: null };
    setState(createCollectionActionState());

    const unsubscribeLike = subscribeToLikeStatus(
      { media: mediaSnapshot, userId },
      (isLikedStatus) => {
        if (!isMounted) return;
        const pending = pendingStatusRef.current.like;
        if (pending && pending.expiresAt > Date.now() && pending.value !== isLikedStatus) {
          return;
        }
        setState((prev) => ({
          ...prev,
          liked: isLikedStatus,
          loadingLike: false,
        }));
      },
    );

    const unsubscribeWatched = subscribeToWatchedStatus(
      { media: mediaSnapshot, userId },
      (isWatchedStatus) => {
        if (!isMounted) return;
        setState((prev) => ({
          ...prev,
          watched: isWatchedStatus,
          loadingWatched: false,
        }));
      },
    );

    const unsubscribeWatchlist = subscribeToWatchlistStatus(
      { media: mediaSnapshot, userId },
      (isWatchlistStatus) => {
        if (!isMounted) return;
        const pending = pendingStatusRef.current.watchlist;
        if (pending && pending.expiresAt > Date.now() && pending.value !== isWatchlistStatus) {
          return;
        }
        setState((prev) => ({
          ...prev,
          watchlist: isWatchlistStatus,
          loadingWatchlist: false,
        }));
      },
    );

    return () => {
      isMounted = false;
      unsubscribeLike();
      unsubscribeWatched();
      unsubscribeWatchlist();
    };
  }, [
    auth.isAuthenticated,
    auth.isReady,
    isSessionReady,
    mediaSnapshot.entityId,
    mediaSnapshot.entityType,
    userId,
  ]);

  const handleLikeClick = async () => {
    if (!auth.isReady) {
      return;
    }
    if (!auth.isAuthenticated) {
      const authHref = buildAuthHref(AUTH_ROUTES.SIGN_IN, currentPath, 'like');
      router.push(authHref);
      return;
    }
    if (state.submittingLike || state.loadingLike) {
      return;
    }
    const previousLikedState = state.liked;
    const nextLikedState = !state.liked;
    const intent = nextLikedState ? 'add' : 'remove';
    pendingStatusRef.current.like = { value: nextLikedState, expiresAt: Date.now() + 5000 };
    setState((prev) => ({
      ...prev,
      liked: nextLikedState,
      submittingLike: true,
      likeIntent: intent,
    }));

    try {
      await toggleUserLike({
        media: mediaSnapshot,
        userId: auth.user.id,
      });
      // The mutation promise is the success signal. Keep the UI aligned with
      // the user's click instead of trusting a toggle RPC's ambiguous boolean.
      setState((prev) => ({ ...prev, liked: nextLikedState }));
    } catch {
      pendingStatusRef.current.like = null;
      setState((prev) => ({ ...prev, liked: previousLikedState }));
      toast.error('Action Failed', 'Could not update your like status. Please try again.');
    } finally {
      setState((prev) => ({ ...prev, submittingLike: false, likeIntent: null }));
    }
  };

  const handleWatchedClick = async () => {
    if (!auth.isReady) {
      return;
    }
    if (!auth.isAuthenticated) {
      const authHref = buildAuthHref(AUTH_ROUTES.SIGN_IN, currentPath, 'watched');
      router.push(authHref);
      return;
    }
    if (state.submittingWatched || state.loadingWatched) {
      return;
    }
    const previousWatchedState = state.watched;
    const nextWatchedState = !state.watched;
    const intent = nextWatchedState ? 'add' : 'remove';
    setState((prev) => ({
      ...prev,
      watched: nextWatchedState,
      liked: nextWatchedState ? prev.liked : false,
      submittingWatched: true,
      watchedIntent: intent,
    }));

    try {
      if (nextWatchedState) {
        await markUserWatched({
          media: mediaSnapshot,
          userId: auth.user.id,
        });
      } else {
        await removeUserWatchedItem({
          media: mediaSnapshot,
          userId: auth.user.id,
        });
      }
    } catch {
      setState((prev) => ({ ...prev, watched: previousWatchedState }));
      toast.error('Action Failed', 'Could not update watched status. Please try again.');
    } finally {
      setState((prev) => ({ ...prev, submittingWatched: false, watchedIntent: null }));
    }
  };

  const handleWatchlistClick = async () => {
    if (!auth.isReady) {
      return;
    }
    if (!auth.isAuthenticated) {
      const authHref = buildAuthHref(AUTH_ROUTES.SIGN_IN, currentPath, 'watchlist');
      router.push(authHref);
      return;
    }
    if (state.submittingWatchlist || state.loadingWatchlist) {
      return;
    }
    const previousWatchlistState = state.watchlist;
    const nextWatchlistState = !state.watchlist;
    const intent = nextWatchlistState ? 'add' : 'remove';
    pendingStatusRef.current.watchlist = {
      value: nextWatchlistState,
      expiresAt: Date.now() + 5000,
    };
    setState((prev) => ({
      ...prev,
      watchlist: nextWatchlistState,
      submittingWatchlist: true,
      watchlistIntent: intent,
    }));

    try {
      const result = await toggleUserWatchlistItem({
        media: mediaSnapshot,
        userId: auth.user.id,
      });
      setState((prev) => ({ ...prev, watchlist: result?.isInWatchlist === true }));
    } catch {
      pendingStatusRef.current.watchlist = null;
      setState((prev) => ({ ...prev, watchlist: previousWatchlistState }));
      toast.error('Action Failed', 'Could not update watchlist status. Please try again.');
    } finally {
      setState((prev) => ({ ...prev, submittingWatchlist: false, watchlistIntent: null }));
    }
  };

  const handleOpenListPicker = () => {
    if (!auth.isReady) {
      return;
    }
    if (!auth.isAuthenticated) {
      const authHref = buildAuthHref(AUTH_ROUTES.SIGN_IN, currentPath, 'add-to-list');
      router.push(authHref);
      return;
    }
    if (!mediaSnapshot?.entityId) {
      return;
    }
    openSurface(
      createListPickerSurfaceEntry({
        media: mediaSnapshot,
        userId,
      }),
    );
  };

  const handleOpenWatchProviders = () => {
    if (!mediaSnapshot?.entityId) {
      return;
    }
    openSurface(WatchProvidersSurface, {
      providers: mediaSnapshot.watchProviders || media?.['watch/providers'],
    });
  };

  const showLikeAction = state.watched;
  const showWatchlistAction = !state.watched;
  const shouldShowAuthActions = auth.isReady && auth.isAuthenticated;
  const canGoToMedia = Boolean(mediaSnapshot?.entityId) && isMediaReviewsRoute;
  const resolvedAdditionalActions = Array.isArray(additionalActions)
    ? additionalActions.filter((action) => action?.key && action?.icon && action?.label)
    : [];
  const inlineAdditionalActions = shouldShowAuthActions ? [] : resolvedAdditionalActions;
  const stackedAdditionalActions = shouldShowAuthActions ? resolvedAdditionalActions : [];

  function handleGoToMedia() {
    if (!mediaSnapshot?.entityId) {
      return;
    }
    router.push(getMediaDetailPath(mediaSnapshot));
  }

  return (
    <div className="flex flex-col gap-2">
      {canGoToMedia ? (
        <ActionItem index={0}>
          <ActionButton
            icon="solar:clapperboard-play-bold"
            label={mediaSnapshot.entityType === 'tv' ? 'Go to Series' : 'Go to Movie'}
            onClick={handleGoToMedia}
            palette="neutral"
          />
        </ActionItem>
      ) : null}

      {showLikeAction ? (
        <ActionItem index={1}>
          <ActionButton
            active={state.liked}
            disabled={state.loadingLike || state.submittingLike}
            icon={state.liked ? 'solar:heart-bold' : 'solar:heart-linear'}
            label={state.liked ? 'Liked' : 'Like'}
            loading={state.loadingLike || state.submittingLike}
            loadingLabel={
              state.loadingLike ? 'Checking' : state.likeIntent === 'remove' ? 'Removing' : 'Adding'
            }
            onClick={handleLikeClick}
            palette="like"
          />
        </ActionItem>
      ) : null}

      <div className={cn('grid gap-2', showWatchlistAction ? 'grid-cols-2' : 'grid-cols-1')}>
        <ActionItem index={2}>
          <ActionButton
            active={state.watched}
            disabled={state.loadingWatched || state.submittingWatched}
            icon={state.watched ? 'solar:eye-bold' : 'solar:eye-linear'}
            label={state.watched ? 'Unwatch' : 'Mark Watched'}
            loading={state.loadingWatched || state.submittingWatched}
            loadingLabel={
              state.loadingWatched
                ? 'Checking'
                : state.watchedIntent === 'remove'
                  ? 'Removing'
                  : 'Saving'
            }
            onClick={handleWatchedClick}
            palette="watched"
          />
        </ActionItem>

        {showWatchlistAction ? (
          <ActionItem index={3}>
            <ActionButton
              active={state.watchlist}
              disabled={state.loadingWatchlist || state.submittingWatchlist}
              icon={state.watchlist ? 'solar:bookmark-bold' : 'solar:bookmark-linear'}
              label={state.watchlist ? 'In Watchlist' : 'Watchlist'}
              loading={state.loadingWatchlist || state.submittingWatchlist}
              loadingLabel={
                state.loadingWatchlist
                  ? 'Checking'
                  : state.watchlistIntent === 'remove'
                    ? 'Removing'
                    : 'Adding'
              }
              onClick={handleWatchlistClick}
              palette="watchlist"
            />
          </ActionItem>
        ) : null}
      </div>

      <div
        className={cn(
          'grid gap-2',
          shouldShowAuthActions || inlineAdditionalActions.length ? 'grid-cols-2' : 'grid-cols-1',
        )}
      >
        <ActionItem index={4}>
          <ActionButton
            icon="solar:list-broken"
            label="Add To List"
            onClick={handleOpenListPicker}
            palette="neutral"
          />
        </ActionItem>

        {shouldShowAuthActions ? (
          <ActionItem index={5}>
            <ActionButton
              icon="solar:tv-bold"
              label="Where to Watch"
              onClick={handleOpenWatchProviders}
              palette="neutral"
            />
          </ActionItem>
        ) : null}

        {inlineAdditionalActions.map((action, index) => (
          <ActionItem key={action.key} index={5 + index}>
            <ActionButton
              active={action.active}
              disabled={action.disabled}
              icon={action.icon}
              label={action.label}
              onClick={action.onClick}
              palette={action.palette || 'neutral'}
            />
          </ActionItem>
        ))}
      </div>

      {stackedAdditionalActions.map((action, index) => (
        <ActionItem key={action.key} index={6 + index}>
          <ActionButton
            active={action.active}
            disabled={action.disabled}
            icon={action.icon}
            label={action.label}
            onClick={action.onClick}
            palette={action.palette || 'neutral'}
          />
        </ActionItem>
      ))}
    </div>
  );
}
