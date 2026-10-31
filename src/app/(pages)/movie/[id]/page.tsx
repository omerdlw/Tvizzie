import type { JSX } from "react";
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import {
  readParam,
  type SearchParams,
} from "@/infrastructure/http/search-params";
import { parseMovieId } from "@/features/movie";
import { MoviePageContent } from "@/features/movie/server";
import { tmdbImageUrl } from "@/infrastructure/tmdb/images";
import { getMovieDetails } from "@/infrastructure/tmdb/server";
import { project, shareMetadata } from "@/config/project";
import { reviewHref } from "@/config/routes";

interface MoviePageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
}

export async function generateMetadata({
  params,
}: MoviePageProps): Promise<Metadata> {
  const id = parseMovieId((await params).id);
  const result = id === null ? null : await getMovieDetails(id);
  if (!result?.success) return { title: `Movie · ${project.name}` };

  const movie = result.data;
  const title = movie.releaseYear
    ? `${movie.title} (${movie.releaseYear})`
    : movie.title;
  return shareMetadata({
    description: movie.overview ?? `${movie.title} on ${project.name}`,
    image: tmdbImageUrl("poster", movie.posterPath, "w500"),
    title,
    type: "video.movie",
  });
}

export default async function MoviePage({
  params,
  searchParams,
}: MoviePageProps): Promise<JSX.Element> {
  const [{ id: rawId }, query] = await Promise.all([params, searchParams]);
  const id = parseMovieId(rawId);
  if (id === null) notFound();
  // Old links to one person's review now open the reviews page.
  const reviewer = readParam(query, "review");
  if (reviewer) permanentRedirect(reviewHref(id, reviewer));
  return <MoviePageContent id={id} />;
}
