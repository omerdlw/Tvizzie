"use client";

import { useState, type JSX } from "react";
import { cn } from "@omerdlw/base-framework/utils";
import { movieHref } from "@config/routes";
import { Button, MediaCard } from "@/ui";
import { RatingStars } from "@/features/reviews/components/rating-stars";
import { ReviewActions } from "@/features/reviews/components/review-actions";
import type { ReviewCardData } from "../../lib/browse-data";
import { formatShortDate } from "../../lib/dates";
import { AccountLink } from "./account-link";
import { posterImage } from "./poster";

type Review = Omit<ReviewCardData, "createdAt">;

function Body({ review }: { review: Review }) {
  const [revealed, setRevealed] = useState(false);
  if (!review.content.trim()) return null;
  if (review.isSpoiler && !revealed) {
    return (
      <p className="text-sm leading-6 text-white/50 italic">
        This review may contain spoilers.{" "}
        <Button
          className="cursor-pointer font-medium text-white/80 not-italic underline-offset-2 hover:text-white hover:underline"
          onClick={() => setRevealed(true)}
          type="button"
        >
          Show it anyway
        </Button>
      </p>
    );
  }
  return (
    <p className="line-clamp-6 text-sm leading-6 whitespace-pre-line text-pretty text-white/70">
      {review.content}
    </p>
  );
}

function ReviewRow({
  isOwner,
  review,
  signedIn,
}: {
  isOwner: boolean;
  review: Review;
  signedIn: boolean;
}) {
  const href = movieHref(review.tmdbId);
  return (
    <li className="flex gap-4 py-6 first:pt-0 last:pb-0 sm:gap-5">
      <MediaCard
        aspect="free"
        className="w-14 shrink-0 sm:w-[4.5rem]"
        fallbackIcon="solar:clapperboard-play-bold"
        fallbackIconSize={16}
        frameClassName="aspect-[2/3] w-full"
        href={href}
        image={posterImage(review.posterPath, "72px")}
        label={review.year ? `${review.title} (${review.year})` : review.title}
        radius={4}
      />
      <article className="flex min-w-0 flex-1 flex-col">
        <h3 className="flex min-w-0 flex-wrap items-baseline gap-x-2">
          <AccountLink
            className="text-base leading-6 font-semibold text-white hover:underline sm:text-lg sm:leading-7"
            href={href}
          >
            {review.title}
          </AccountLink>
          {review.year ? (
            <span className="text-sm text-white/40 tabular-nums">
              {review.year}
            </span>
          ) : null}
        </h3>
        <p className="mt-1 flex items-center gap-3 text-xs text-white/40">
          {review.rating ? (
            <RatingStars rating={review.rating} size={12} />
          ) : null}
          <time dateTime={review.updatedAt}>
            {formatShortDate(review.updatedAt)}
          </time>
        </p>
        <div className="mt-3">
          <Body review={review} />
        </div>
        <footer className="mt-2 -ml-2 flex items-center">
          <ReviewActions
            id={review.id}
            isOwner={isOwner}
            liked={review.liked}
            likesCount={review.likesCount}
            plain
            signedIn={signedIn}
          />
        </footer>
      </article>
    </li>
  );
}

export function ReviewList({
  className,
  isOwner,
  reviews,
  signedIn,
}: {
  className?: string;
  isOwner: boolean;
  reviews: readonly Review[];
  signedIn: boolean;
}): JSX.Element {
  return (
    <ul className={cn("flex flex-col divide-y divide-white/[0.07]", className)}>
      {reviews.map((review) => (
        <ReviewRow
          isOwner={isOwner}
          key={review.id}
          review={review}
          signedIn={signedIn}
        />
      ))}
    </ul>
  );
}
