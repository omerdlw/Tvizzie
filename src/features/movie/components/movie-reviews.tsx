"use client";

import type { JSX } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { useDockActions } from "@omerdlw/base-framework/modules/dock";
import { AccountLink } from "@/features/account/components/browse/account-link";
import {
  RatingStars,
  ReviewActions,
  ReviewBody,
  createReviewEditorSurfaceEntry,
  Star,
  useMovieReviews,
  type MovieReview,
} from "@/features/reviews";
import { Avatar, Icon } from "@/ui";
import { SCENE } from "../lib/motion";
import { Cascade, Header, Item, Section } from "../stage";
import { EASE } from "../lib/tempo";

const DATE = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

function LitStars({ rating }: { rating: number | null }): JSX.Element {
  if (rating === null || !Number.isFinite(rating) || rating <= 0) {
    return <RatingStars rating={rating} />;
  }
  const value = Math.min(5, Math.max(0, rating));
  const { at, gap, run } = SCENE.stars;
  return (
    <span
      aria-label={`${value} out of 5`}
      className="inline-flex items-center gap-1"
      role="img"
      title={`${value} out of 5`}
    >
      {Array.from({ length: 5 }, (_, index) => {
        const fill = value - index;
        return (
          <motion.span
            className="inline-flex"
            key={index}
            variants={{
              hidden: { opacity: 0, rotate: -40, scale: 0.2 },
              visible: {
                opacity: 1,
                rotate: 0,
                scale: 1,
                transition: {
                  delay: at + index * gap,
                  duration: run,
                  ease: EASE.expo,
                },
              },
            }}
          >
            <Star fill={fill} size={14} />
          </motion.span>
        );
      })}
    </span>
  );
}

function Card({
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
  const profile = `/account/${encodeURIComponent(review.author.username)}`;

  return (
    <Item as="li" className="flex py-6 first:pt-0 last:pb-0" from="up">
      <article className="flex w-full flex-col gap-3">
        <div className="flex items-center gap-3.5">
          <AccountLink className="flex shrink-0" href={profile}>
            <Avatar
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
              <span className="shrink-0 translate-y-0.5">
                <LitStars rating={review.rating} />
              </span>
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
              plain
              signedIn={viewerId !== null}
            />
          </div>
        </div>

        {review.content ? (
          <div className="[&_p]:text-[15px] [&_p]:leading-7 [&_p]:text-white/70">
            <ReviewBody content={review.content} isSpoiler={review.isSpoiler} />
          </div>
        ) : null}
      </article>
    </Item>
  );
}

export function MovieReviews({
  movieId,
  title,
}: {
  movieId: number;
  title: string;
}): JSX.Element | null {
  const loaded = useMovieReviews(movieId);
  if (!loaded || loaded.reviews.length === 0) return null;
  const { reviews, stats, viewerId } = loaded;

  return (
    <Section className="flex w-full flex-col">
      <Header
        actions={
          <div className="flex items-center gap-3 text-xs font-semibold text-white/50">
            {stats.average !== null ? (
              <span className="inline-flex items-center gap-1">
                <Icon
                  className="text-amber-400"
                  icon="solar:star-bold"
                  size={13}
                />
                <strong className="text-white">{stats.average}/5</strong>
                <span className="hidden sm:inline">({stats.rated} rated)</span>
              </span>
            ) : null}
            <span>
              <strong className="text-white">{stats.total}</strong>{" "}
              {stats.total === 1 ? "review" : "reviews"}
            </span>
            {stats.total > reviews.length ? (
              <AccountLink
                className="inline-flex items-center gap-1 uppercase hover:text-white"
                href={`/movie/${movieId}/reviews`}
              >
                All reviews
                <Icon icon="solar:alt-arrow-right-linear" size={12} />
              </AccountLink>
            ) : null}
          </div>
        }
        icon="solar:chat-round-line-bold"
        title="Community Reviews"
      />
      <Cascade
        as="ul"
        className="flex flex-col divide-y divide-white/10"
        gap={SCENE.items.cards}
      >
        {reviews.map((review) => (
          <Card
            key={review.id}
            movieId={movieId}
            review={review}
            title={title}
            viewerId={viewerId}
          />
        ))}
      </Cascade>
    </Section>
  );
}
