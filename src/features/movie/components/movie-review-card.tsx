"use client";

import type { JSX } from "react";
import { useRouter } from "next/navigation";
import { motion, useTransform } from "motion/react";
import { useDockActions } from "@omerdlw/base-framework/modules/dock";
import { AccountLink } from "@/features/account";
import {
  RatingStars,
  ReviewActions,
  ReviewBody,
  createReviewEditorSurfaceEntry,
  Star,
  type MovieReview,
} from "@/features/reviews";
import { Avatar, Icon, TONE } from "@/ui";
import { SCENE } from "../lib/motion";
import { ease, Item, useProgress } from "@/motion/stage";
import { accountHref } from "@/config/routes";

const DATE = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

function useLitMotion(index: number) {
  const { at, gap, run } = SCENE.stars;
  const lit = useProgress(at + index * gap, run, ease.pour);
  return {
    opacity: useTransform(lit, (p) => ease.fade(p)),
    scale: useTransform(lit, (p) => 0.7 + 0.3 * p),
  };
}

function LitStar({ fill, index }: { fill: number; index: number }) {
  return (
    <motion.span className="inline-flex" style={useLitMotion(index)}>
      <Star fill={fill} size={14} />
    </motion.span>
  );
}

function LitFilmLike({ author, index }: { author: string; index: number }) {
  const style = useLitMotion(index);
  return (
    <motion.span className="inline-flex shrink-0" style={style}>
      <Icon
        aria-label={`${author} liked this film`}
        className="text-[#ff9010]"
        icon="solar:heart-bold"
        size={14}
      />
    </motion.span>
  );
}

function LitStars({ rating }: { rating: number | null }): JSX.Element {
  if (rating === null || !Number.isFinite(rating) || rating <= 0) {
    return <RatingStars rating={rating} />;
  }
  const value = Math.min(5, Math.max(0, rating));
  return (
    <span
      aria-label={`${value} out of 5`}
      className="inline-flex items-center gap-1"
      role="img"
      title={`${value} out of 5`}
    >
      {Array.from({ length: 5 }, (_, index) => (
        <LitStar fill={value - index} index={index} key={index} />
      ))}
    </span>
  );
}

export function ReviewCard({
  movieId,
  review,
  title,
  viewerId,
}: {
  movieId: number;
  review: MovieReview;
  title: string;
  viewerId: string | null;
}): JSX.Element {
  const router = useRouter();
  const { openSurface } = useDockActions();
  const profile = accountHref(review.author.username);
  const hasRating =
    review.rating !== null &&
    Number.isFinite(review.rating) &&
    review.rating > 0;

  return (
    <Item as="li" className="flex py-6 first:pt-0 last:pb-0" from="light">
      <article className="grid w-full grid-cols-[44px_minmax(0,1fr)] items-start gap-x-3.5 gap-y-3">
        <AccountLink className="flex shrink-0 self-start" href={profile}>
          <Avatar
            className="rounded-full"
            name={review.author.displayName}
            size={44}
            src={review.author.avatarUrl ?? undefined}
          />
        </AccountLink>
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="min-w-0">
            <AccountLink
              className="block truncate text-base font-semibold text-white hover:underline"
              href={profile}
            >
              {review.author.displayName}
            </AccountLink>
            <time
              className="text-xs font-semibold text-white/50"
              dateTime={review.updatedAt}
            >
              {DATE.format(new Date(review.updatedAt))}
            </time>
          </div>
          <div className="flex min-w-0 items-center justify-between gap-4 sm:shrink-0 sm:justify-end">
            <div className="flex shrink-0 items-center gap-2.5">
              <LitStars rating={review.rating} />
              {review.authorLiked ? (
                <LitFilmLike
                  author={review.author.displayName}
                  index={hasRating ? 5 : 0}
                />
              ) : null}
            </div>
            <div className="shrink-0">
              <ReviewActions
                id={review.id}
                isOwner={review.author.id === viewerId}
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
        </div>

        {review.content ? (
          <div className="col-start-2 min-w-0 [&_p]:text-[15px] [&_p]:leading-7 [&_p]:text-white/70">
            <ReviewBody
              content={review.content}
              isSpoiler={review.isSpoiler}
              revealClassName={`rounded-full ${TONE.surface}`}
            />
          </div>
        ) : null}
      </article>
    </Item>
  );
}
