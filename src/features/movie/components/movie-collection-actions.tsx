"use client";

import {
  useCallback,
  useEffect,
  useState,
  type ComponentProps,
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
  getMovieLibraryAction,
  logMovieToDiaryAction,
  setMovieLibraryAction,
} from "@/features/account";
import { createSignInSurfaceEntry, useAuth } from "@/features/auth";
import { SCENE } from "../lib/motion";
import { StageAction } from "@/motion/stage";
import { useMovieView } from "./movie-views";
import { createListPickerSurfaceEntry } from "./surfaces/list-picker-surface";

const SIZE = "h-12 px-4 py-0 disabled:cursor-wait";
const SECONDARY_SIZE = "h-11 gap-2 px-3";

function Action({
  label,
  secondary = false,
  shortLabel,
  ...props
}: Omit<
  ComponentProps<typeof StageAction>,
  "ariaLabel" | "className" | "fade" | "iconSize" | "label"
> & {
  label: string;
  secondary?: boolean;
  shortLabel?: string;
}): JSX.Element {
  return (
    <StageAction
      {...props}
      ariaLabel={secondary && shortLabel ? label : undefined}
      className={cn(SIZE, secondary && SECONDARY_SIZE)}
      fade={{ run: SCENE.action.run, since: SCENE.action.content }}
      iconSize={secondary ? 14 : 16}
      label={
        shortLabel && secondary ? (
          shortLabel
        ) : shortLabel ? (
          <>
            <span className="sm:max-xl:hidden">{label}</span>
            <span className="hidden sm:max-xl:inline">{shortLabel}</span>
          </>
        ) : (
          label
        )
      }
    />
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

export function AwardsAction(): JSX.Element {
  const { toggle, view } = useMovieView();
  const open = view === "awards";

  return (
    <Action
      active={open}
      disabled={false}
      hoverLabel={open ? "Back" : undefined}
      icon={ICONS.awards}
      label="Awards"
      onClick={() => toggle("awards")}
      secondary
      grow
    />
  );
}

export function MovieCollectionActions({
  children,
  movieId,
}: {
  children?: ReactNode;
  movieId: number;
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

  return (
    <div className="grid grid-cols-2 gap-3">
      {state.watched ? (
        <>
          <Action
            active={state.liked}
            disabled={disabled}
            hoverLabel={state.liked ? "Unlike" : undefined}
            icon={ICONS.like}
            label={state.liked ? "Liked" : "Like"}
            onClick={() => void toggle("liked")}
          />
          <Action
            active
            disabled={disabled}
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
            icon={ICONS.watched}
            label="Mark watched"
            onClick={() => void toggle("watched")}
          />
          <Action
            active={state.watchlist}
            disabled={disabled}
            hoverLabel={state.watchlist ? "Remove" : undefined}
            icon={ICONS.watchlist}
            label={state.watchlist ? "In Watchlist" : "Watchlist"}
            onClick={() => void toggle("watchlist")}
          />
        </>
      )}
      <div className="col-span-2 flex gap-3">
        <Action
          active={false}
          disabled={!auth.isReady}
          grow
          icon={ICONS.list}
          label="Add to list"
          onClick={openLists}
          secondary
          shortLabel="List"
        />
        <Action
          active={false}
          disabled={disabled}
          grow
          icon={ICONS.diary}
          label="Log to diary"
          loading={logging}
          onClick={() => void logToDiary()}
          secondary
          shortLabel="Diary"
        />
        {children}
      </div>
    </div>
  );
}
