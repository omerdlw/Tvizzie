"use client";

import type { JSX } from "react";
import { useRouter } from "next/navigation";
import { useDockActions } from "@omerdlw/base-framework/modules/dock";
import { AccountLink } from "@/features/account/components/browse/account-link";
import { Avatar } from "@/ui";
import type { MovieReview } from "../lib/types";
import { RatingStars } from "./rating-stars";
import { createReviewEditorSurfaceEntry } from "./review-editor-surface";
import { ReviewActions, ReviewBody } from "./review-actions";

const DATE = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export function MovieReviewList({
  movieId,
  reviews,
  title,
  viewerId,
}: {
  movieId: number;
  reviews: readonly MovieReview[];
  title: string;
  viewerId: string | null;
}): JSX.Element {
  const router = useRouter();
  const { openSurface } = useDockActions();

  return (
    <ul className="flex flex-col gap-2.5">
      {reviews.map((review) => {
        const profile = `/account/${encodeURIComponent(review.author.username)}`;
        const isOwn = review.author.id === viewerId;
        const verb = review.content
          ? "Review by"
          : review.rating !== null
            ? "Rated by"
            : "Logged by";

        return (
          <li
            className="flex gap-3.5 rounded-[20px] bg-white/5 p-3.5 ring-1 ring-white/5 ring-inset sm:gap-4 sm:p-4"
            key={review.id}
          >
            <AccountLink className="shrink-0" href={profile}>
              <Avatar
                name={review.author.displayName}
                size={44}
                src={review.author.avatarUrl ?? undefined}
              />
            </AccountLink>
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                <span className="text-xs text-white/50">{verb}</span>
                <AccountLink
                  className="text-sm font-semibold text-white hover:underline"
                  href={profile}
                >
                  {review.author.displayName}
                </AccountLink>
                <RatingStars rating={review.rating} />
              </div>

              {review.content ? (
                <ReviewBody
                  content={review.content}
                  isSpoiler={review.isSpoiler}
                />
              ) : null}

              <div className="mt-auto flex items-center justify-between gap-3 pt-1">
                <time
                  className="text-xs font-semibold text-white/50"
                  dateTime={review.updatedAt}
                >
                  {DATE.format(new Date(review.updatedAt))}
                </time>
                <ReviewActions
                  id={review.id}
                  isOwner={isOwn}
                  liked={review.liked}
                  likesCount={review.likesCount}
                  onEdit={() =>
                    void openSurface(
                      createReviewEditorSurfaceEntry({
                        kind: "movie",
                        movieId,
                        onSaved: () => router.refresh(),
                        review: {
                          content: review.content,
                          isSpoiler: review.isSpoiler,
                          rating: review.rating,
                        },
                        title,
                      }),
                    )
                  }
                  signedIn={viewerId !== null}
                />
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
