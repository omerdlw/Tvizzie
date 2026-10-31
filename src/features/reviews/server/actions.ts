"use server";

import "server-only";
import { report, toUserMessage } from "@omerdlw/base-framework/utils";
import { fail, getOptionalUser, mutate, ok } from "@/features/auth/server";
import { createServerSupabaseClient } from "@/infrastructure/supabase/server";
import { isTmdbId } from "@/infrastructure/tmdb/validation";
import { getMovieDetails } from "@/infrastructure/tmdb/server";
import { movieSnapshot } from "@/infrastructure/tmdb/snapshot";
import { rememberWatchedPayload } from "@/features/account/server";
import {
  REVIEWS_PAGE_SIZE,
  isMovieReviewFilter,
  isMovieReviewSort,
  type MovieReviewFilter,
  type MovieReviewSort,
} from "../lib/constants";
import type {
  MovieReview,
  ReviewInput,
  ReviewResult,
  ReviewStats,
} from "../lib/types";
import { getReviewValidationError } from "../lib/validation";
import { getMovieReviews, getReviewStats } from "./queries";
import { isUuid } from "@/infrastructure/uuid";

function clean(input: ReviewInput): ReviewInput {
  const content =
    typeof input?.content === "string" ? input.content.trim() : "";
  return {
    content,
    isSpoiler: Boolean(input?.isSpoiler) && content.length > 0,
    rating: typeof input?.rating === "number" ? input.rating : null,
  };
}

export async function getOwnMovieReviewAction(
  tmdbId: number,
): Promise<ReviewResult<{ review: ReviewInput | null }>> {
  if (!isTmdbId(tmdbId)) return fail("Invalid movie");
  try {
    const user = await getOptionalUser();
    if (!user) return ok({ review: null });

    const client = await createServerSupabaseClient();
    const { data, error } = await client
      .from("reviews")
      .select("content, rating, is_spoiler")
      .eq("account_id", user.id)
      .eq("tmdb_id", tmdbId)
      .maybeSingle();
    if (error) throw error;

    return ok({
      review: data
        ? {
            content: data.content,
            isSpoiler: data.is_spoiler,
            rating: data.rating === null ? null : Number(data.rating),
          }
        : null,
    });
  } catch (error) {
    report("Review read", error);
    return fail(
      toUserMessage(error, { fallback: "Could not load your review" }),
    );
  }
}

export async function getMovieReviewsPageAction(
  tmdbId: number,
  {
    filter,
    from,
    limit = REVIEWS_PAGE_SIZE,
    sort,
    username,
  }: {
    filter: MovieReviewFilter;
    from: number;
    limit?: number;
    sort: MovieReviewSort;
    username: string | null;
  },
): Promise<
  ReviewResult<{
    reviews: MovieReview[];
    stats: ReviewStats;
    total: number;
    viewerId: string | null;
  }>
> {
  if (
    !isTmdbId(tmdbId) ||
    !isMovieReviewSort(sort) ||
    !isMovieReviewFilter(filter) ||
    !Number.isInteger(from) ||
    from < 0 ||
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > REVIEWS_PAGE_SIZE ||
    (username !== null && typeof username !== "string")
  ) {
    return fail("Invalid request");
  }
  try {
    const [viewer, client] = await Promise.all([
      getOptionalUser(),
      createServerSupabaseClient(),
    ]);
    const viewerId = viewer?.id ?? null;
    const [{ reviews, total }, stats] = await Promise.all([
      getMovieReviews({
        client,
        filter,
        from,
        limit,
        sort,
        tmdbId,
        username,
        viewerId,
      }),
      getReviewStats({ client, tmdbId, username }),
    ]);
    return ok({ reviews, stats, total, viewerId });
  } catch (error) {
    report("Reviews page read", error);
    return fail(toUserMessage(error, { fallback: "Could not load reviews" }));
  }
}

export async function saveMovieReviewAction(
  tmdbId: number,
  input: ReviewInput,
): Promise<ReviewResult> {
  const review = clean(input);
  const problem = getReviewValidationError({
    content: review.content,
    rating: review.rating,
  });
  if (!isTmdbId(tmdbId)) return fail("Invalid movie");
  if (problem) return fail(problem);

  return mutate(
    {
      fallback: "Could not save your review",
      name: "Review save",
      perMinute: 60,
      scope: "review-change",
    },
    async ({ client, userId }) => {
      const movie = await getMovieDetails(tmdbId);
      if (!movie.success) return fail("Could not load this movie, try again");

      const { backdrop_path, payload, poster_path, release_date, title } =
        movieSnapshot(movie.data);
      const { error } = await client.from("reviews").upsert(
        {
          account_id: userId,
          backdrop_path,
          content: review.content,
          is_spoiler: review.isSpoiler,
          poster_path,
          rating: review.rating,
          release_date,
          title,
          tmdb_id: tmdbId,
        },
        { onConflict: "account_id,tmdb_id" },
      );
      if (error) throw error;
      await rememberWatchedPayload(client, userId, tmdbId, payload);
      return ok();
    },
  );
}

export async function saveListCommentAction(
  listId: string,
  content: string,
): Promise<ReviewResult> {
  const text = typeof content === "string" ? content.trim() : "";
  const problem = getReviewValidationError({
    allowRating: false,
    content: text,
    rating: null,
    requireText: true,
    textLabel: "comment",
  });
  if (!isUuid(listId)) return fail("Invalid request");
  if (problem) return fail(problem);

  return mutate(
    {
      fallback: "Could not post your comment",
      name: "List comment",
      perMinute: 60,
      scope: "review-change",
    },
    async ({ client, userId }) => {
      const { data: list, error: listError } = await client
        .from("lists")
        .select("account_id")
        .eq("id", listId)
        .maybeSingle();
      if (listError) throw listError;
      if (!list) return fail("This list is no longer available");
      if (list.account_id === userId) {
        return fail("You can't comment on your own list");
      }

      const { error } = await client
        .from("reviews")
        .upsert(
          { account_id: userId, content: text, list_id: listId },
          { onConflict: "account_id,list_id" },
        );
      if (error) throw error;
      return ok();
    },
  );
}

export async function deleteReviewAction(id: string): Promise<ReviewResult> {
  if (!isUuid(id)) return fail("Invalid request");
  return mutate(
    {
      fallback: "Could not delete this review",
      name: "Review delete",
      perMinute: 60,
      scope: "review-change",
    },
    async ({ client, userId }) => {
      const { error } = await client
        .from("reviews")
        .delete()
        .eq("id", id)
        .eq("account_id", userId);
      if (error) throw error;
      return ok();
    },
  );
}

export async function setReviewLikeAction(
  reviewId: string,
  liked: boolean,
): Promise<ReviewResult> {
  if (!isUuid(reviewId)) return fail("Invalid request");
  return mutate(
    {
      fallback: "Could not update your like",
      name: "Review like",
      perMinute: 60,
      scope: "review-change",
    },
    async ({ client, userId }) => {
      const { error } = liked
        ? await client
            .from("review_likes")
            .upsert(
              { account_id: userId, review_id: reviewId },
              { ignoreDuplicates: true, onConflict: "review_id,account_id" },
            )
        : await client
            .from("review_likes")
            .delete()
            .eq("review_id", reviewId)
            .eq("account_id", userId);
      if (error) throw error;
      return ok();
    },
  );
}
