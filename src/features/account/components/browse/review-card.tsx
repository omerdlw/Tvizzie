import type { JSX } from "react";
import { movieHref } from "@config/routes";
import { MediaCard } from "@/ui";
import type { ReviewCardData } from "../../lib/browse-data";
import { posterImage } from "./poster";
import { RatingStars } from "@/features/reviews/components/rating-stars";
import {
  ReviewActions,
  ReviewBody,
} from "@/features/reviews/components/review-actions";

const DATE = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
  year: "numeric",
});

export function ReviewCard({
  isOwner,
  review,
  signedIn,
}: {
  isOwner: boolean;
  review: ReviewCardData;
  signedIn: boolean;
}): JSX.Element {
  return (
    <article className="flex gap-4 rounded-[20px] bg-white/5 p-3 ring-1 ring-white/5 ring-inset sm:gap-5 sm:p-4">
      <MediaCard
        className="w-20 shrink-0 sm:w-24"
        fallbackIcon="solar:clapperboard-play-bold"
        href={movieHref(review.tmdbId)}
        image={posterImage(review.posterPath, "96px")}
        label={review.title}
        radius={12}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-2 py-0.5">
        <header className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
          <h3 className="min-w-0 truncate text-sm font-semibold text-white sm:text-base">
            {review.title}
          </h3>
          {review.year ? (
            <span className="text-xs font-semibold text-white/40">
              {review.year}
            </span>
          ) : null}
          <RatingStars rating={review.rating} />
        </header>

        {review.content ? (
          <ReviewBody content={review.content} isSpoiler={review.isSpoiler} />
        ) : null}

        <footer className="mt-auto flex items-center justify-between gap-3 pt-1">
          <time
            className="text-xs font-semibold text-white/40"
            dateTime={review.updatedAt}
          >
            {DATE.format(new Date(review.updatedAt))}
          </time>
          <ReviewActions
            id={review.id}
            isOwner={isOwner}
            liked={review.liked}
            likesCount={review.likesCount}
            signedIn={signedIn}
          />
        </footer>
      </div>
    </article>
  );
}
