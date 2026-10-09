"use client";

import { useEffect, useState } from "react";
import { useGlobalEvent } from "@omerdlw/base-framework/hooks";
import { report } from "@omerdlw/base-framework/utils";
import { RECENT_REVIEWS, REVIEW_EVENTS } from "./constants";
import { getMovieReviewsAction } from "../server/actions";
import type { MovieReview, ReviewStats } from "./types";

interface LoadedReviews {
  reviews: MovieReview[];
  stats: ReviewStats;
  viewerId: string | null;
}

export function useMovieReviews(movieId: number): LoadedReviews | null {
  const [loaded, setLoaded] = useState<LoadedReviews | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;

    getMovieReviewsAction(movieId, "newest", RECENT_REVIEWS)
      .then((result) => {
        if (cancelled) return;
        if (result.success) {
          setLoaded({
            reviews: result.reviews,
            stats: result.stats,
            viewerId: result.viewerId,
          });
        } else {
          report("MovieReviews load", result.error);
        }
      })
      .catch((error) => report("MovieReviews load", error));

    return () => {
      cancelled = true;
    };
  }, [movieId, version]);

  useGlobalEvent(REVIEW_EVENTS.CHANGE, () => setVersion((v) => v + 1));

  return loaded;
}
