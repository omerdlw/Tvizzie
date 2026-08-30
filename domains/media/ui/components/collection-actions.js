'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { useAuth, useAuthSessionReady } from '@/modules/auth';
import { useToast } from '@/modules/notification';
import { subscribeToLikeStatus, toggleUserLike } from '@/domains/media/client/likes';
import {
  markUserWatched,
  removeUserWatchedItem,
  subscribeToWatchedStatus,
} from '@/domains/media/client/watched';
import {
  subscribeToWatchlistStatus,
  toggleUserWatchlistItem,
} from '@/domains/media/client/watchlist';
import { cn } from '@/ui/class-names';
import { getMediaDetailPath, resolveExplicitMediaType } from '@/domains/media/utils/media-key';
import { getMediaTitle } from '@/domains/media/utils/media-data';
import { getCurrentPathWithSearch } from '@/domains/auth/utils/routes';
import { useNavigationActions } from '@/modules/nav';
import { createListPickerSurfaceEntry } from '@/domains/shell/navigation/surfaces/list-picker-surface';
import { createSignInSurfaceEntry } from '@/domains/shell/navigation/surfaces/sign-in-surface';
import { createWatchDiarySurfaceEntry } from '@/domains/shell/navigation/surfaces/watch-diary-surface';
import { createWatchProvidersSurfaceEntry } from '@/domains/shell/navigation/surfaces/watch-providers-surface';
import { Button } from '@/ui/primitives';
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

function createCollectionActionState() {
  return {
    liked: false,
    watched: false,
    watchlist: false,
  };
}

function getActionPalette(palette, active) {
  if (!active) {
    return 'ring-1 ring-inset cursor-pointer ring-white/5 bg-white/5 hover:ring-white/10 hover:bg-white/10 text-white/70 hover:text-white';
  }
  if (palette === 'like') {
    return 'ring-1 ring-inset ring-success/30 cursor-pointer bg-success/20 text-success hover:ring-success/40 hover:bg-success/30';
  }
  if (palette === 'watched' || palette === 'watchlist') {
    return 'ring-1 ring-inset ring-info/30 cursor-pointer bg-info/20 text-info hover:ring-info/40 hover:bg-info/30';
  }

  return 'ring-1 ring-inset cursor-pointer ring-white/5 bg-white/5 hover:ring-white/10 hover:bg-white/10 text-white/70 hover:text-white';
}

function ActionButton({
  active = false,
  className,
  disabled = false,
  icon,
  label,
  onClick,
  palette,
  hoverLabel = null,
}) {
  return (
    <Button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'group center xs:text-xs h-auto w-full gap-2.5 rounded-[20px] p-4 text-xs font-bold uppercase select-none disabled:cursor-not-allowed',
        getActionPalette(palette, active),
        className,
      )}
    >
      <span
        className={cn(
          'inline-flex shrink-0 transition-transform duration-200 ease-out',
          active ? 'scale-110' : 'group-hover:scale-105',
        )}
      >
        <Icon icon={icon} size={16} />
      </span>
      <span className="relative truncate">
        <span className={cn(hoverLabel && 'transition-opacity duration-150 group-hover:opacity-0')}>
          {label}
        </span>
        {hoverLabel ? (
          <span className="absolute inset-0 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100">
            {hoverLabel}
          </span>
        ) : null}
      </span>
    </Button>
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
  const [pendingAction, setPendingAction] = useState(null);
  const pendingStatusRef = useRef({ like: null, watched: null, watchlist: null });

  useEffect(() => {
    if (
      !mediaSnapshot.entityId ||
      !auth.isReady ||
      !auth.isAuthenticated ||
      !isSessionReady ||
      !userId
    ) {
      return undefined;
    }

    let isMounted = true;

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
        }));
      },
    );

    const unsubscribeWatched = subscribeToWatchedStatus(
      { media: mediaSnapshot, userId },
      (isWatchedStatus) => {
        if (!isMounted) return;
        const pending = pendingStatusRef.current.watched;
        if (pending && pending.expiresAt > Date.now() && pending.value !== isWatchedStatus) {
          return;
        }
        setState((prev) => ({
          ...prev,
          watched: isWatchedStatus,
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
    if (!auth.isReady || pendingAction) {
      return;
    }
    if (!auth.isAuthenticated) {
      void openSurface(createSignInSurfaceEntry({ next: currentPath }));
      return;
    }

    const previousLikedState = state.liked;
    const nextLikedState = !state.liked;
    setPendingAction('like');
    pendingStatusRef.current.like = { value: nextLikedState, expiresAt: Date.now() + 5000 };

    setState((prev) => ({
      ...prev,
      liked: nextLikedState,
    }));

    try {
      await toggleUserLike({
        media: mediaSnapshot,
        userId: auth.user.id,
      });
    } catch {
      pendingStatusRef.current.like = null;
      setState((prev) => ({ ...prev, liked: previousLikedState }));
      toast.error('Action Failed', 'Could not update your like status. Please try again.');
    } finally {
      pendingStatusRef.current.like = null;
      setPendingAction(null);
    }
  };

  const handleWatchedClick = async () => {
    if (!auth.isReady || pendingAction) {
      return;
    }
    if (!auth.isAuthenticated) {
      void openSurface(createSignInSurfaceEntry({ next: currentPath }));
      return;
    }

    const previousWatchedState = state.watched;
    const nextWatchedState = !state.watched;
    setPendingAction('watched');
    pendingStatusRef.current.watched = {
      value: nextWatchedState,
      expiresAt: Date.now() + 5000,
    };
    setState((prev) => ({ ...prev, watched: nextWatchedState }));

    try {
      if (nextWatchedState) {
        await markUserWatched({ media: mediaSnapshot, userId: auth.user.id });
      } else {
        const result = await removeUserWatchedItem({
          media: mediaSnapshot,
          userId: auth.user.id,
        });
        if (result?.wasUnliked) {
          setState((prev) => ({ ...prev, liked: false }));
        }
      }
    } catch {
      pendingStatusRef.current.watched = null;
      setState((prev) => ({ ...prev, watched: previousWatchedState }));
      toast.error('Action Failed', 'Could not update your watched status. Please try again.');
    } finally {
      pendingStatusRef.current.watched = null;
      setPendingAction(null);
    }
  };

  const handleOpenWatchDiary = () => {
    if (!auth.isReady) return;
    if (!auth.isAuthenticated) {
      void openSurface(createSignInSurfaceEntry({ next: currentPath }));
      return;
    }
    void openSurface(
      createWatchDiarySurfaceEntry({
        media: mediaSnapshot,
        userId: auth.user.id,
      }),
    );
  };

  const handleWatchlistClick = async () => {
    if (!auth.isReady || pendingAction) {
      return;
    }
    if (!auth.isAuthenticated) {
      void openSurface(createSignInSurfaceEntry({ next: currentPath }));
      return;
    }

    const previousWatchlistState = state.watchlist;
    const nextWatchlistState = !state.watchlist;
    setPendingAction('watchlist');
    pendingStatusRef.current.watchlist = {
      value: nextWatchlistState,
      expiresAt: Date.now() + 5000,
    };

    setState((prev) => ({
      ...prev,
      watchlist: nextWatchlistState,
    }));

    try {
      const result = await toggleUserWatchlistItem({
        media: mediaSnapshot,
        userId: auth.user.id,
      });
      if (typeof result?.isInWatchlist === 'boolean') {
        setState((prev) => ({ ...prev, watchlist: result.isInWatchlist }));
      }
    } catch {
      pendingStatusRef.current.watchlist = null;
      setState((prev) => ({ ...prev, watchlist: previousWatchlistState }));
      toast.error('Action Failed', 'Could not update watchlist status. Please try again.');
    } finally {
      pendingStatusRef.current.watchlist = null;
      setPendingAction(null);
    }
  };

  const handleOpenListPicker = () => {
    if (!auth.isReady) {
      return;
    }
    if (!auth.isAuthenticated) {
      void openSurface(createSignInSurfaceEntry({ next: currentPath }));
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
    openSurface(
      createWatchProvidersSurfaceEntry({
        providers: mediaSnapshot.watchProviders || media?.['watch/providers'],
        title: mediaSnapshot.title,
        media: mediaSnapshot,
      }),
    );
  };

  const canGoToMedia = Boolean(mediaSnapshot?.entityId) && isMediaReviewsRoute;
  const resolvedAdditionalActions = Array.isArray(additionalActions)
    ? additionalActions.filter((action) => action?.key && action?.icon && action?.label)
    : [];

  function handleGoToMedia() {
    if (!mediaSnapshot?.entityId) {
      return;
    }
    router.push(getMediaDetailPath(mediaSnapshot));
  }

  return (
    <div className="flex flex-col gap-2.5">
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

      {state.watched ? (
        <div className="grid grid-cols-2 gap-2.5">
          <ActionItem index={1}>
            <ActionButton
              active={state.liked}
              disabled={Boolean(pendingAction)}
              icon={state.liked ? 'solar:heart-bold' : 'solar:heart-linear'}
              label={state.liked ? 'Liked' : 'Like'}
              hoverLabel={state.liked ? 'Unlike' : null}
              onClick={handleLikeClick}
              palette="like"
            />
          </ActionItem>
          <ActionItem index={2}>
            <ActionButton
              active={state.watched}
              disabled={Boolean(pendingAction)}
              icon="solar:eye-bold"
              label="Watched"
              hoverLabel="Unwatched"
              onClick={handleWatchedClick}
              palette="watched"
            />
          </ActionItem>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2.5">
          <ActionItem index={1}>
            <ActionButton
              active={false}
              disabled={Boolean(pendingAction)}
              icon="solar:eye-linear"
              label="Mark watched"
              onClick={handleWatchedClick}
              palette="watched"
            />
          </ActionItem>
          <ActionItem index={2}>
            <ActionButton
              active={state.watchlist}
              disabled={Boolean(pendingAction)}
              icon={state.watchlist ? 'solar:bookmark-bold' : 'solar:bookmark-linear'}
              label={state.watchlist ? 'In Watchlist' : 'Watchlist'}
              hoverLabel={state.watchlist ? 'Remove from list' : null}
              onClick={handleWatchlistClick}
              palette="watchlist"
            />
          </ActionItem>
        </div>
      )}

      {mediaSnapshot.entityType !== 'tv' ? (
        <>
          <div className="grid grid-cols-2 gap-2.5">
            <ActionItem index={3}>
              <ActionButton
                icon="solar:calendar-add-bold"
                label="Log to diary"
                onClick={handleOpenWatchDiary}
                palette="neutral"
              />
            </ActionItem>
            <ActionItem index={4}>
              <ActionButton
                icon="solar:list-broken"
                label="Add To List"
                onClick={handleOpenListPicker}
                palette="neutral"
              />
            </ActionItem>
          </div>

          <div
            className={cn(
              'grid gap-2.5',
              resolvedAdditionalActions.length > 0 ? 'grid-cols-2' : 'grid-cols-1',
            )}
          >
            <ActionItem index={5}>
              <ActionButton
                icon="solar:tv-bold"
                label="Where to Watch"
                onClick={handleOpenWatchProviders}
                palette="neutral"
              />
            </ActionItem>

            {resolvedAdditionalActions.map((action, index) => {
              const isLastOdd =
                index === resolvedAdditionalActions.length - 1 &&
                (1 + resolvedAdditionalActions.length) % 2 === 1;

              return (
                <ActionItem key={action.key} index={6 + index}>
                  <ActionButton
                    active={action.active}
                    className={isLastOdd ? 'col-span-2' : undefined}
                    disabled={action.disabled}
                    icon={action.icon}
                    label={action.label}
                    onClick={action.onClick}
                    palette={action.palette || 'neutral'}
                  />
                </ActionItem>
              );
            })}
          </div>
        </>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2.5">
            <ActionItem index={3}>
              <ActionButton
                icon="solar:list-broken"
                label="Add To List"
                onClick={handleOpenListPicker}
                palette="neutral"
              />
            </ActionItem>
            <ActionItem index={4}>
              <ActionButton
                icon="solar:tv-bold"
                label="Where to Watch"
                onClick={handleOpenWatchProviders}
                palette="neutral"
              />
            </ActionItem>
          </div>

          {resolvedAdditionalActions.length > 0 ? (
            <div
              className={cn(
                'grid gap-2.5',
                resolvedAdditionalActions.length > 1 ? 'grid-cols-2' : 'grid-cols-1',
              )}
            >
              {resolvedAdditionalActions.map((action, index) => {
                const isLastOdd =
                  index === resolvedAdditionalActions.length - 1 &&
                  resolvedAdditionalActions.length % 2 === 1;

                return (
                  <ActionItem key={action.key} index={5 + index}>
                    <ActionButton
                      active={action.active}
                      className={isLastOdd ? 'col-span-2' : undefined}
                      disabled={action.disabled}
                      icon={action.icon}
                      label={action.label}
                      onClick={action.onClick}
                      palette={action.palette || 'neutral'}
                    />
                  </ActionItem>
                );
              })}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
