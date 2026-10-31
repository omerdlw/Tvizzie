import type { JSX } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  readParam,
  type SearchParams,
} from "@/infrastructure/http/search-params";
import { parseMovieId } from "@/features/movie";
import { MoviePageContent } from "@/features/movie/server";
import { isMovieReviewSort } from "@/features/reviews";
import { tmdbImageUrl } from "@/infrastructure/tmdb/images";
import { getMovieDetails } from "@/infrastructure/tmdb/server";
import { project, shareMetadata } from "@/config/project";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const id = parseMovieId((await params).id);
  const result = id === null ? null : await getMovieDetails(id);
  if (!result?.success) return { title: `Reviews · ${project.name}` };

  const movie = result.data;
  const title = movie.releaseYear
    ? `${movie.title} (${movie.releaseYear})`
    : movie.title;
  return shareMetadata({
    description: `What members of ${project.name} wrote about ${movie.title}`,
    image: tmdbImageUrl("poster", movie.posterPath, "w500"),
    title: `Reviews of ${title}`,
    type: "video.movie",
  });
}

export default async function MovieReviewsPage({
  params,
  searchParams,
}: Props): Promise<JSX.Element> {
  const [{ id: rawId }, query] = await Promise.all([params, searchParams]);
  const id = parseMovieId(rawId);
  if (id === null) notFound();
  const sort = readParam(query, "sort");
  return (
    <MoviePageContent
      id={id}
      reviews={{
        reviewer: readParam(query, "user") || null,
        sort: isMovieReviewSort(sort) ? sort : "newest",
      }}
    />
  );
}
