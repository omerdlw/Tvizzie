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

function LitStar({ fill, index }: { fill: number; index: number }) {
  const { at, gap, run } = SCENE.stars;
  const lit = useProgress(at + index * gap, run, ease.pour);
  const opacity = useTransform(lit, (p) => ease.fade(p));
  const scale = useTransform(lit, (p) => 0.7 + 0.3 * p);
  return (
    <motion.span className="inline-flex" style={{ opacity, scale }}>
      <Star fill={fill} size={14} />
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

  return (
    <Item as="li" className="flex py-6 first:pt-0 last:pb-0" from="light">
      <article className="flex w-full flex-col gap-3">
        <div className="flex items-center gap-3.5">
          <AccountLink className="flex shrink-0" href={profile}>
            <Avatar
              className="rounded-full"
              name={review.author.displayName}
              size={44}
              src={review.author.avatarUrl ?? undefined}
            />
          </AccountLink>
          <div className="flex min-w-0 flex-col gap-1">
            <div className="flex min-w-0 items-center gap-3">
              <AccountLink
                className="truncate text-base font-semibold text-white hover:underline"
                href={profile}
              >
                {review.author.displayName}
              </AccountLink>
              <span className="flex shrink-0 translate-y-0.5">
                <LitStars rating={review.rating} />
              </span>
              {review.authorLiked ? (
                <Icon
                  aria-label={`${review.author.displayName} liked this film`}
                  className="shrink-0 text-[#ff9010]"
                  icon="solar:heart-bold"
                  size={14}
                />
              ) : null}
            </div>
            <time
              className="text-xs font-semibold text-white/50"
              dateTime={review.updatedAt}
            >
              {DATE.format(new Date(review.updatedAt))}
            </time>
          </div>
          <div className="ml-auto -mr-2 shrink-0">
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

        {review.content ? (
          <div className="[&_p]:text-[15px] [&_p]:leading-7 [&_p]:text-white/70">
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
