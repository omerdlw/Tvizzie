import type { JSX } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  readPage,
  readParam,
  type SearchParams,
} from "@/features/account/lib/browse";
import { EmptyState } from "@/features/account/components/browse/empty-state";
import { FilterBar } from "@/features/account/components/browse/filter-bar";
import { Pagination } from "@/features/account/components/browse/pagination";
import { getOptionalUser } from "@/features/auth/server/server";
import { MoviePageChrome, parseMovieId } from "@/features/movie";
import {
  MOVIE_REVIEW_SORTS,
  MovieReviewList,
  REVIEWS_PAGE_SIZE,
  isMovieReviewSort,
} from "@/features/reviews";
import {
  getMovieReviews,
  getReviewStats,
} from "@/features/reviews/server/queries";
import { Icon } from "@/ui";
import { createServerSupabaseClient } from "@/infrastructure/supabase/server";
import { getMovieDetails } from "@/infrastructure/tmdb/server";
import { project } from "@config/project";
import { AccountLink } from "@/features/account/components/browse/account-link";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const id = parseMovieId((await params).id);
  const result = id === null ? null : await getMovieDetails(id);
  return {
    title: result?.success
      ? `Reviews of ${result.data.title} · ${project.name}`
      : `Reviews · ${project.name}`,
  };
}

export default async function MovieReviewsPage({
  params,
  searchParams,
}: Props): Promise<JSX.Element> {
  const [{ id: rawId }, query] = await Promise.all([params, searchParams]);
  const id = parseMovieId(rawId);
  if (id === null) notFound();

  const movie = await getMovieDetails(id);
  if (!movie.success) {
    if (movie.error.kind === "not_found") notFound();
    throw new Error(`Movie ${id} is unavailable (${movie.error.kind})`);
  }

  const sortParam = readParam(query, "sort");
  const sort = isMovieReviewSort(sortParam) ? sortParam : "newest";
  const username = readParam(query, "user") || null;
  const page = readPage(query);

  const [viewer, client] = await Promise.all([
    getOptionalUser(),
    createServerSupabaseClient(),
  ]);
  const viewerId = viewer?.id ?? null;

  const [{ reviews, total }, stats] = await Promise.all([
    getMovieReviews({
      client,
      from: (page - 1) * REVIEWS_PAGE_SIZE,
      limit: REVIEWS_PAGE_SIZE,
      sort,
      tmdbId: id,
      username,
      viewerId,
    }),
    getReviewStats({ client, tmdbId: id, username }),
  ]);

  const pageCount = Math.max(1, Math.ceil(total / REVIEWS_PAGE_SIZE));

  return (
    <main className="min-h-screen">
      <MoviePageChrome movie={movie.data} />
      <div className="mx-auto w-full max-w-4xl px-4 pt-24 pb-24 sm:px-6 lg:px-8">
        <header className="mb-6 flex flex-col gap-3">
          <AccountLink
            className="inline-flex w-fit items-center gap-1.5 text-xs font-semibold text-white/50 uppercase hover:text-white"
            href={`/movie/${id}`}
          >
            <Icon icon="solar:alt-arrow-left-linear" size={12} />
            {movie.data.title}
          </AccountLink>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-2xl font-semibold text-white sm:text-3xl">
              {username ? `Review by ${username}` : "Community Reviews"}
            </h1>
            <p className="flex items-center gap-3 text-xs font-semibold text-white/50">
              {stats.average !== null ? (
                <span className="inline-flex items-center gap-1">
                  <Icon
                    className="text-amber-400"
                    icon="solar:star-bold"
                    size={13}
                  />
                  <strong className="text-white">{stats.average}/5</strong>
                  <span>({stats.rated} rated)</span>
                </span>
              ) : null}
              <span>
                <strong className="text-white">{stats.total}</strong>{" "}
                {stats.total === 1 ? "review" : "reviews"}
              </span>
            </p>
          </div>
          {username ? (
            <AccountLink
              className="w-fit text-xs font-semibold text-white/50 uppercase hover:text-white"
              href={`/movie/${id}/reviews`}
            >
              Show everyone’s reviews
            </AccountLink>
          ) : null}
        </header>

        {total > 1 ? (
          <FilterBar
            fields={[
              {
                defaultValue: "newest",
                key: "sort",
                options: MOVIE_REVIEW_SORTS,
              },
            ]}
            searchPlaceholder={null}
          />
        ) : null}

        {reviews.length > 0 ? (
          <>
            <MovieReviewList
              movieId={id}
              reviews={reviews}
              title={movie.data.title}
              viewerId={viewerId}
            />
            <Pagination page={page} pageCount={pageCount} />
          </>
        ) : (
          <EmptyState icon="solar:chat-round-line-bold">
            {username ? "No review from this account" : "No reviews yet"}
          </EmptyState>
        )}
      </div>
    </main>
  );
}
