"use client";

import { useEffect, useState, type JSX } from "react";
import { useGlobalEvent } from "@omerdlw/base-framework/hooks";
import { report } from "@omerdlw/base-framework/utils";
import { AccountLink } from "@/features/account";
import {
  REVIEW_EVENTS,
  getMovieReviewsPageAction,
  type MovieReview,
  type MovieReviewSort,
} from "@/features/reviews";
import { TONE } from "@/ui";
import { SCENE } from "../lib/motion";
import { Header, Section, Swap } from "@/motion/stage";
import { movieReviewsHref } from "@/config/routes";
import { ReviewCard } from "./movie-review-card";

const SHOWN = 4;

interface Digest {
  popular: MovieReview[];
  recent: MovieReview[];
  viewerId: string | null;
}

function ReviewsSection({
  icon,
  movieId,
  reviews,
  sort,
  title,
  movieTitle,
  viewerId,
}: {
  icon: string;
  movieId: number;
  movieTitle: string;
  reviews: readonly MovieReview[];
  sort: MovieReviewSort;
  title: string;
  viewerId: string | null;
}): JSX.Element {
  return (
    <Section className="flex w-full flex-col">
      <Header
        actions={
          <AccountLink
            className={`${TONE.label} text-white/40 ui-fade hover:text-white`}
            href={movieReviewsHref(movieId, {
              sort: sort === "newest" ? undefined : sort,
            })}
          >
            More
          </AccountLink>
        }
        icon={icon}
        title={title}
      />
      <Swap
        as="ul"
        className={`flex flex-col divide-y ${TONE.rules}`}
        gap={SCENE.items.cards}
        id={sort}
      >
        {reviews.map((review) => (
          <ReviewCard
            key={review.id}
            movieId={movieId}
            review={review}
            title={movieTitle}
            viewerId={viewerId}
          />
        ))}
      </Swap>
    </Section>
  );
}

// The film page shows a taste of what people wrote: the most liked written
// reviews and the newest ones. Everything else lives on the reviews page.
export function MovieReviewDigest({
  movieId,
  title,
}: {
  movieId: number;
  title: string;
}): JSX.Element | null {
  const [digest, setDigest] = useState<Digest | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const read = (sort: MovieReviewSort) =>
      getMovieReviewsPageAction(movieId, {
        filter: "written",
        from: 0,
        limit: SHOWN,
        sort,
        username: null,
      });

    Promise.all([read("likes_desc"), read("newest")])
      .then(([popular, recent]) => {
        if (cancelled) return;
        if (!popular.success) return report("Review digest", popular.error);
        if (!recent.success) return report("Review digest", recent.error);
        setDigest({
          // A review nobody liked is not popular, only there.
          popular: popular.reviews.filter((review) => review.likesCount > 0),
          recent: recent.reviews,
          viewerId: recent.viewerId,
        });
      })
      .catch((error) => report("Review digest", error));

    return () => {
      cancelled = true;
    };
  }, [movieId, version]);

  useGlobalEvent<{ reason?: string }>(REVIEW_EVENTS.CHANGE, (payload) => {
    if (payload?.reason !== "like") setVersion((current) => current + 1);
  });

  if (!digest) return null;
  const { popular, recent, viewerId } = digest;

  return (
    <>
      {popular.length > 0 ? (
        <ReviewsSection
          icon="solar:fire-bold"
          movieId={movieId}
          movieTitle={title}
          reviews={popular}
          sort="likes_desc"
          title="Popular Reviews"
          viewerId={viewerId}
        />
      ) : null}
      {recent.length > 0 ? (
        <ReviewsSection
          icon="solar:clock-circle-bold"
          movieId={movieId}
          movieTitle={title}
          reviews={recent}
          sort="newest"
          title="Recent Reviews"
          viewerId={viewerId}
        />
      ) : null}
    </>
  );
}
