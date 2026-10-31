"use client";

import { RatingStars } from "@/features/reviews";
import { Highlight, MediaCard, ResultRow } from "@/ui";
import { tmdbImageSrcSet, tmdbImageUrl } from "@/infrastructure/tmdb/images";
import type { ReviewSearchHit } from "../lib/types";
import { reviewHref } from "@/config/routes";

const POSTER_WIDTHS = ["w185"] as const;

export function ReviewResultRow({
  onNavigated,
  query,
  review,
}: {
  onNavigated?: () => void;
  query?: string;
  review: ReviewSearchHit;
}) {
  const title = review.year ? `${review.title} (${review.year})` : review.title;

  return (
    <ResultRow
      href={reviewHref(review.tmdbId, review.author.username)}
      label={`${review.author.displayName}'s review of ${title}`}
      meta={
        <>
          {review.rating !== null ? (
            <RatingStars
              className="shrink-0"
              rating={review.rating}
              size={10}
            />
          ) : null}
          <span className="shrink-0">@{review.author.username}</span>
          <span aria-hidden="true">·</span>
          <span className="truncate">
            {review.isSpoiler ? (
              "Contains spoilers"
            ) : (
              <Highlight query={query} text={review.excerpt} />
            )}
          </span>
        </>
      }
      onNavigated={onNavigated}
      thumb={
        <MediaCard
          fallbackIcon="solar:chat-round-bold"
          fallbackIconSize={16}
          image={{
            sizes: "32px",
            src: tmdbImageUrl("poster", review.posterPath, "w185"),
            srcSet:
              tmdbImageSrcSet("poster", review.posterPath, POSTER_WIDTHS) ??
              undefined,
          }}
          radius={8}
        />
      }
      title={
        <>
          <Highlight query={query} text={review.title} />
          {review.year ? (
            <span className="font-normal text-white/50"> {review.year}</span>
          ) : null}
        </>
      }
    />
  );
}
