"use server";

import "server-only";
import { report, toUserMessage } from "@omerdlw/base-framework/utils";
import { getOptionalUser } from "@/features/auth/server/server";
import { createServerSupabaseClient } from "@/infrastructure/supabase/server";
import { isMovieId } from "@/infrastructure/tmdb/movies";
import { getMovieDetails } from "@/infrastructure/tmdb/server";
import { movieSnapshot } from "@/infrastructure/tmdb/snapshot";
import {
  RECENT_REVIEWS,
  isMovieReviewSort,
  type MovieReviewSort,
} from "../lib/constants";
import type {
  MovieReview,
  ReviewInput,
  ReviewResult,
  ReviewStats,
} from "../lib/types";
import { getReviewValidationError } from "../lib/validation";
import { change, fail, ok } from "./change";
import { getMovieReviews, getReviewStats } from "./queries";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
  if (!isMovieId(tmdbId)) return fail("Invalid movie");
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

export async function getMovieReviewsAction(
  tmdbId: number,
  sort: MovieReviewSort = "newest",
  limit: number = RECENT_REVIEWS,
): Promise<
  ReviewResult<{
    reviews: MovieReview[];
    stats: ReviewStats;
    viewerId: string | null;
  }>
> {
  if (!isMovieId(tmdbId) || !isMovieReviewSort(sort)) {
    return fail("Invalid request");
  }
  try {
    const [viewer, client] = await Promise.all([
      getOptionalUser(),
      createServerSupabaseClient(),
    ]);
    const viewerId = viewer?.id ?? null;
    const [{ reviews }, stats] = await Promise.all([
      getMovieReviews({
        client,
        limit: Math.min(Math.max(1, Math.floor(limit)), 50),
        sort,
        tmdbId,
        viewerId,
      }),
      getReviewStats({ client, tmdbId }),
    ]);
    return ok({ reviews, stats, viewerId });
  } catch (error) {
    report("Reviews read", error);
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
  if (!isMovieId(tmdbId)) return fail("Invalid movie");
  if (problem) return fail(problem);

  return change(
    "Review save",
    "Could not save your review",
    async ({ client, userId }) => {
      const movie = await getMovieDetails(tmdbId);
      if (!movie.success) return fail("Could not load this movie, try again");

      const { backdrop_path, poster_path, release_date, title } = movieSnapshot(
        movie.data,
      );
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
  if (!UUID.test(listId)) return fail("Invalid request");
  if (problem) return fail(problem);

  return change(
    "List comment",
    "Could not post your comment",
    async ({ client, userId }) => {
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
  if (!UUID.test(id)) return fail("Invalid request");
  return change(
    "Review delete",
    "Could not delete this review",
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
  if (!UUID.test(reviewId)) return fail("Invalid request");
  return change(
    "Review like",
    "Could not update your like",
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
