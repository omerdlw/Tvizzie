"use client";

import {
  useCallback,
  useEffect,
  useState,
  type JSX,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { useDockActions } from "@omerdlw/base-framework/modules/dock";
import { useToast } from "@omerdlw/base-framework/modules/notification";
import { cn, report, toUserMessage } from "@omerdlw/base-framework/utils";
import {
  EMPTY_MOVIE_LIBRARY,
  applyMovieLibraryChange,
  localDiaryDate,
  type MovieLibraryKind,
  type MovieLibraryState,
} from "@/features/account/lib/library";
import {
  getMovieLibraryAction,
  logMovieToDiaryAction,
  setMovieLibraryAction,
} from "@/features/account/server/library-actions";
import { createSignInSurfaceEntry, useAuth } from "@/features/auth";
import { Button, Icon } from "@/ui";
import { Magnet } from "@/motion/film";
import { SCENE } from "../lib/motion";
import { Rise, trackSpotlight } from "../stage";
import { useMovieView } from "./movie-views";
import { createListPickerSurfaceEntry } from "./surfaces/list-picker-surface";
import { createWatchProvidersSurfaceEntry } from "./surfaces/watch-providers-surface";

const BASE =
  "cine-card cine-fade cine-spot group center relative h-auto w-full cursor-pointer gap-2.5 overflow-hidden rounded-[20px] p-4 text-xs font-bold uppercase ring-1 ring-inset select-none outline-none focus-visible:ring-white/50 disabled:cursor-wait";
const IDLE =
  "bg-white/5 text-white/70 ring-white/5 hover:bg-white/10 hover:text-white hover:ring-white/10";
const ACTIVE =
  "bg-[rgb(var(--grade)/0.16)] text-[rgb(var(--grade))] ring-[rgb(var(--grade)/0.3)] hover:bg-[rgb(var(--grade)/0.24)] hover:ring-[rgb(var(--grade)/0.4)]";

interface ActionProps {
  active: boolean;
  disabled: boolean;
  from: "left" | "right";
  order: number;
  grow?: boolean;
  hoverLabel?: string;
  icon: { off: string; on: string };
  label: string;
  loading?: boolean;
  onClick: () => void;
  shortLabel?: string;
}

function Action({
  active,
  disabled,
  from,
  hoverLabel,
  icon,
  label,
  loading,
  onClick,
  order,
  shortLabel,
  grow,
}: ActionProps): JSX.Element {
  return (
    <Rise
      at={SCENE.buttons.at + order * SCENE.buttons.gap}
      className={cn("min-w-0", grow && "flex-1")}
      from={from}
    >
      <Button
        aria-pressed={active}
        className={cn(BASE, active ? ACTIVE : IDLE)}
        disabled={disabled}
        loading={loading}
        onClick={onClick}
        onPointerMove={trackSpotlight}
      >
        <Magnet className="gap-2.5">
          <span
            className={cn(
              "inline-flex shrink-0 transition-[scale] duration-slow ease-out-expo",
              active ? "scale-110" : "group-hover:scale-110",
            )}
          >
            <Icon icon={active ? icon.on : icon.off} size={16} />
          </span>
          <span className="relative">
            <span
              className={cn(hoverLabel && "cine-fade group-hover:opacity-0")}
            >
              {shortLabel ? (
                <>
                  <span className="sm:max-xl:hidden">{label}</span>
                  <span className="hidden sm:max-xl:inline">{shortLabel}</span>
                </>
              ) : (
                label
              )}
            </span>
            {hoverLabel ? (
              <span className="cine-fade absolute inset-0 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100">
                {hoverLabel}
              </span>
            ) : null}
          </span>
        </Magnet>
      </Button>
    </Rise>
  );
}

const ICONS = {
  like: { off: "solar:heart-linear", on: "solar:heart-bold" },
  watched: { off: "solar:eye-linear", on: "solar:eye-bold" },
  watchlist: { off: "solar:bookmark-linear", on: "solar:bookmark-bold" },
  diary: { off: "solar:notebook-linear", on: "solar:notebook-bold" },
  list: { off: "solar:folder-open-linear", on: "solar:folder-open-bold" },
  providers: { off: "solar:tv-linear", on: "solar:tv-bold" },
  awards: { off: "solar:cup-star-linear", on: "solar:cup-star-bold" },
};

export function AwardsAction({ order }: { order: number }): JSX.Element {
  const { toggle, view } = useMovieView();
  const open = view === "awards";

  return (
    <Action
      active={open}
      disabled={false}
      from="right"
      hoverLabel={open ? "Back" : undefined}
      icon={ICONS.awards}
      label="Awards"
      onClick={() => toggle("awards")}
      order={order}
      grow
    />
  );
}

export function MovieCollectionActions({
  children,
  hasProviders,
  movieId,
  title,
}: {
  children?: ReactNode;
  hasProviders: boolean;
  movieId: number;
  title: string;
}): JSX.Element {
  const auth = useAuth();
  const toast = useToast();
  const router = useRouter();
  const { openSurface } = useDockActions();
  const accountId = auth.isAuthenticated ? (auth.user?.id ?? null) : null;
  const key = accountId ? `${accountId}:${movieId}` : null;

  const [library, setLibrary] = useState<{
    key: string | null;
    state: MovieLibraryState;
  }>({ key: null, state: EMPTY_MOVIE_LIBRARY });
  const [pending, setPending] = useState<MovieLibraryKind | null>(null);
  const [logging, setLogging] = useState(false);

  const isLoaded = key === null || library.key === key;
  const state =
    key !== null && library.key === key ? library.state : EMPTY_MOVIE_LIBRARY;

  useEffect(() => {
    if (!key) return;
    let cancelled = false;

    getMovieLibraryAction(movieId)
      .then((result) => {
        if (cancelled) return;
        if (result.success) setLibrary({ key, state: result.state });
        else report("MovieCollectionActions load", result.error);
      })
      .catch((error) => report("MovieCollectionActions load", error));

    return () => {
      cancelled = true;
    };
  }, [key, movieId]);

  const toggle = useCallback(
    async (kind: MovieLibraryKind) => {
      if (!auth.isReady || pending) return;

      if (!key) {
        void openSurface(
          createSignInSurfaceEntry({
            next: window.location.pathname + window.location.search,
          }),
        );
        return;
      }

      const before = state;
      const active = !before[kind];
      setPending(kind);
      setLibrary({ key, state: applyMovieLibraryChange(before, kind, active) });

      try {
        const result = await setMovieLibraryAction(movieId, kind, active);
        if (result.success) {
          setLibrary({ key, state: result.state });
        } else {
          setLibrary({ key, state: before });
          toast(result.error);
        }
      } catch (error) {
        report("MovieCollectionActions toggle", error);
        setLibrary({ key, state: before });
        toast(
          toUserMessage(error, { fallback: "Could not update your library" }),
        );
      } finally {
        setPending(null);
      }
    },
    [auth.isReady, key, movieId, openSurface, pending, state, toast],
  );

  const disabled = !auth.isReady || !isLoaded || pending !== null || logging;

  const logToDiary = useCallback(async () => {
    if (!auth.isReady || logging) return;

    if (!key) {
      void openSurface(
        createSignInSurfaceEntry({
          next: window.location.pathname + window.location.search,
        }),
      );
      return;
    }

    setLogging(true);
    try {
      const result = await logMovieToDiaryAction(movieId, localDiaryDate());
      if (result.success) {
        router.push("/account");
        return;
      }
      toast(result.error);
    } catch (error) {
      report("MovieCollectionActions diary", error);
      toast(toUserMessage(error, { fallback: "Could not log this movie" }));
    }
    setLogging(false);
  }, [auth.isReady, key, logging, movieId, openSurface, router, toast]);

  const openLists = useCallback(() => {
    if (!auth.isReady) return;
    void openSurface(
      key
        ? createListPickerSurfaceEntry({ movieId })
        : createSignInSurfaceEntry({
            next: window.location.pathname + window.location.search,
          }),
    );
  }, [auth.isReady, key, movieId, openSurface]);

  const openProviders = useCallback(() => {
    void openSurface(createWatchProvidersSurfaceEntry({ movieId, title }));
  }, [movieId, openSurface, title]);

  return (
    <div className="grid grid-cols-2 gap-3">
      {state.watched ? (
        <>
          <Action
            active={state.liked}
            disabled={disabled}
            from="left"
            order={0}
            hoverLabel={state.liked ? "Unlike" : undefined}
            icon={ICONS.like}
            label={state.liked ? "Liked" : "Like"}
            onClick={() => void toggle("liked")}
          />
          <Action
            active
            disabled={disabled}
            from="right"
            order={1}
            hoverLabel="Unwatch"
            icon={ICONS.watched}
            label="Watched"
            onClick={() => void toggle("watched")}
          />
        </>
      ) : (
        <>
          <Action
            active={false}
            disabled={disabled}
            from="left"
            order={0}
            icon={ICONS.watched}
            label="Mark watched"
            onClick={() => void toggle("watched")}
          />
          <Action
            active={state.watchlist}
            disabled={disabled}
            from="right"
            order={1}
            hoverLabel={state.watchlist ? "Remove" : undefined}
            icon={ICONS.watchlist}
            label={state.watchlist ? "In Watchlist" : "Watchlist"}
            onClick={() => void toggle("watchlist")}
          />
        </>
      )}
      <Action
        active={false}
        disabled={!auth.isReady}
        from="left"
        order={2}
        icon={ICONS.list}
        label="Add to list"
        onClick={openLists}
      />
      <Action
        active={false}
        disabled={disabled}
        from="right"
        order={3}
        icon={ICONS.diary}
        label="Log to diary"
        loading={logging}
        onClick={() => void logToDiary()}
      />
      {hasProviders || children ? (
        <div className="col-span-2 flex gap-3 empty:hidden">
          {hasProviders ? (
            <Action
              active={false}
              disabled={false}
              from="left"
              grow
              icon={ICONS.providers}
              label="Where to watch"
              onClick={openProviders}
              order={4}
              shortLabel="Watch"
            />
          ) : null}
          {children}
        </div>
      ) : null}
    </div>
  );
}
