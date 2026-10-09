"use client";

import Link from "next/link";
import { RatingStars } from "@/features/reviews/components/rating-stars";
import { MediaCard } from "@/ui";
import { useDockLinkClick } from "@/motion";
import { tmdbImageSrcSet, tmdbImageUrl } from "@/infrastructure/tmdb/images";
import type { ReviewSearchHit } from "../lib/types";
import { reviewHref } from "../lib/utils";

const POSTER_WIDTHS = ["w185"] as const;

export function ReviewResultRow({
  onNavigated,
  review,
}: {
  onNavigated?: () => void;
  review: ReviewSearchHit;
}) {
  const href = reviewHref(review.tmdbId, review.author.username);
  const handleClick = useDockLinkClick(href, onNavigated);
  const title = review.year ? `${review.title} (${review.year})` : review.title;

  return (
    <Link
      aria-label={`${review.author.displayName}'s review of ${title}`}
      className="cine-fade flex items-center gap-3 rounded-[20px] p-0.5 pr-3 outline-none hover:bg-white/10 focus-visible:bg-white/10"
      href={href}
      onClick={handleClick}
      prefetch={false}
    >
      <MediaCard
        className="w-14 shrink-0"
        fallbackIcon="solar:chat-round-bold"
        fallbackIconSize={20}
        image={{
          sizes: "56px",
          src: tmdbImageUrl("poster", review.posterPath, "w185"),
          srcSet:
            tmdbImageSrcSet("poster", review.posterPath, POSTER_WIDTHS) ??
            undefined,
        }}
        radius={18}
      />
      <span className="flex min-w-0 flex-1 flex-col items-start gap-1">
        <span className="flex w-full items-center gap-2">
          <span className="min-w-0 truncate text-sm leading-tight font-bold text-white">
            {title}
          </span>
          {review.rating !== null ? (
            <RatingStars
              className="shrink-0"
              rating={review.rating}
              size={11}
            />
          ) : null}
        </span>
        <span className="line-clamp-2 text-xs leading-snug text-white/70">
          {review.isSpoiler ? (
            <span className="font-semibold text-white/50">
              Contains spoilers
            </span>
          ) : (
            review.excerpt
          )}
        </span>
        <span className="text-[11px] font-bold text-white/50">
          @{review.author.username}
        </span>
      </span>
    </Link>
  );
}
