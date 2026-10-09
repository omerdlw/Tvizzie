"use client";

import { useCallback, useEffect, useState, type JSX } from "react";
import { useGlobalEvent } from "@omerdlw/base-framework/hooks";
import {
  useDockActionClass,
  useDockActions,
} from "@omerdlw/base-framework/modules/dock";
import { report } from "@omerdlw/base-framework/utils";
import { useAuth } from "@/features/auth";
import { Button, Icon } from "@/ui";
import { REVIEW_EVENTS } from "../lib/constants";
import { getOwnMovieReviewAction } from "../server/actions";
import type { ReviewInput } from "../lib/types";
import { createReviewEditorSurfaceEntry } from "./review-editor-surface";

export function MovieAction({
  hasProviders,
  movieId,
  onOpenProviders,
  title,
}: {
  hasProviders: boolean;
  movieId: number;
  onOpenProviders: () => void;
  title: string;
}): JSX.Element | null {
  const auth = useAuth();
  const actionClass = useDockActionClass();
  const { openSurface } = useDockActions();
  const userId = auth.isAuthenticated ? (auth.user?.id ?? null) : null;
  const key = userId ? `${userId}:${movieId}` : null;

  const [own, setOwn] = useState<{
    key: string;
    review: ReviewInput | null;
  } | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!key) return;
    let cancelled = false;

    getOwnMovieReviewAction(movieId)
      .then((result) => {
        if (cancelled) return;
        if (result.success) setOwn({ key, review: result.review });
        else report("MovieAction load", result.error);
      })
      .catch((error) => report("MovieAction load", error));

    return () => {
      cancelled = true;
    };
  }, [key, movieId, version]);

  useGlobalEvent(key ? REVIEW_EVENTS.CHANGE : null, () =>
    setVersion((current) => current + 1),
  );

  const loaded = own?.key === key;
  const review = loaded ? own.review : null;

  const openEditor = useCallback(() => {
    void openSurface(
      createReviewEditorSurfaceEntry({
        kind: "movie",
        movieId,
        onSaved: (saved) => key && setOwn({ key, review: saved }),
        review,
        title,
      }),
    );
  }, [key, movieId, openSurface, review, title]);

  if (!auth.isReady) return null;

  if (!userId) {
    if (!hasProviders) return null;
    return (
      <Button
        className={actionClass({ className: "w-full" })}
        onClick={onOpenProviders}
        type="button"
      >
        <Icon icon="solar:tv-bold" size={16} />
        <span className="truncate">Where to watch?</span>
      </Button>
    );
  }

  return (
    <Button
      className={actionClass({ className: "w-full" })}
      disabled={!loaded}
      onClick={openEditor}
      type="button"
    >
      <Icon icon="solar:pen-new-square-bold" size={16} />
      <span className="truncate">{review ? "Edit Review" : "Add Review"}</span>
    </Button>
  );
}
