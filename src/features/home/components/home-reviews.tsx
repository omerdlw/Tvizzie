import type { JSX } from "react";
import { AccountLink } from "@/features/account";
import { MoviePosterLink } from "@/features/movie";
import { RatingStars } from "@/features/reviews";
import { Header, Item, Section } from "@/motion/stage";
import { Avatar, Icon, TONE } from "@/ui";
import { accountHref, movieHref, reviewHref } from "@/config/routes";
import { ago, compact } from "../lib/format";
import type { HomeReview } from "../lib/types";

function ReviewCard({ review }: { review: HomeReview }): JSX.Element {
  const { author, film } = review;
  return (
    <Item as="li" className="flex gap-4 py-6 sm:gap-5" from="light">
      <div className="w-16 shrink-0 sm:w-20">
        <MoviePosterLink movie={film} radius={12} sizes="80px" />
      </div>
      <article className="flex min-w-0 flex-1 flex-col gap-2.5">
        <h3 className="flex min-w-0 items-baseline gap-2">
          <AccountLink
            className="truncate text-base font-semibold text-white underline decoration-transparent hover:decoration-current"
            href={movieHref(film.id)}
          >
            {film.title}
          </AccountLink>
          {film.year ? (
            <span className="shrink-0 text-sm text-white/40 tabular-nums">
              {film.year}
            </span>
          ) : null}
        </h3>
        <div className="flex min-w-0 items-center gap-2.5 text-[13px]">
          <AccountLink
            className="flex min-w-0 items-center gap-2 font-semibold text-white/80 hover:text-white"
            href={accountHref(author.username)}
          >
            <Avatar
              className="shrink-0 rounded-full"
              name={author.displayName}
              size={20}
              src={author.avatarUrl ?? undefined}
            />
            <span className="truncate">{author.displayName}</span>
          </AccountLink>
          {review.rating ? (
            <span className="flex shrink-0">
              <RatingStars rating={review.rating} size={12} />
            </span>
          ) : null}
          <time
            className="shrink-0 text-xs text-white/40"
            dateTime={review.createdAt}
          >
            {ago(review.createdAt)}
          </time>
        </div>
        <p className="line-clamp-4 text-[15px] leading-7 text-pretty text-white/65">
          {review.content}
        </p>
        <div className="flex items-center gap-4 text-xs font-medium text-white/45 tabular-nums">
          <span className="inline-flex items-center gap-1.5">
            <Icon icon="solar:heart-bold" size={13} />
            {compact(review.likes)} {review.likes === 1 ? "like" : "likes"}
          </span>
          <AccountLink
            className="text-white/60 underline decoration-transparent hover:text-white hover:decoration-current"
            href={reviewHref(film.id, author.username)}
          >
            Read review
          </AccountLink>
        </div>
      </article>
    </Item>
  );
}

export function HomeReviews({
  reviews,
}: {
  reviews: HomeReview[];
}): JSX.Element | null {
  if (reviews.length === 0) return null;
  return (
    <Section className="flex w-full flex-col">
      <Header
        icon="solar:chat-square-like-bold"
        title="Reviews worth reading"
      />
      <ul
        className={`-my-6 grid grid-cols-1 gap-x-12 divide-y ${TONE.rules} lg:grid-cols-2 lg:divide-y-0 lg:[&>li]:border-b lg:[&>li]:border-white/[0.06] lg:[&>li:nth-last-child(-n+2)]:border-b-0`}
      >
        {reviews.map((review) => (
          <ReviewCard key={review.id} review={review} />
        ))}
      </ul>
    </Section>
  );
}
