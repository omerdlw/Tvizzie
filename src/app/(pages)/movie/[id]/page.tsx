import type { JSX } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MoviePageChrome, MovieView, parseMovieId } from "@/features/movie";
import { tmdbImageUrl } from "@/infrastructure/tmdb/images";
import { getMovieAwards, getMovieDetails } from "@/infrastructure/tmdb/server";
import { project } from "@config/project";

export interface MoviePageProps {
  params: Promise<{ id: string }>;
}

const DESCRIPTION_LIMIT = 200;

function truncate(text: string, limit: number): string {
  return text.length <= limit ? text : `${text.slice(0, limit - 1).trimEnd()}…`;
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
  const description = truncate(
    movie.overview ?? `${movie.title} on ${project.name}`,
    DESCRIPTION_LIMIT,
  );
  const poster = tmdbImageUrl("poster", movie.posterPath, "w500");

  return {
    description,
    openGraph: {
      description,
      images: poster ? [{ url: poster }] : [],
      title,
      type: "video.movie",
    },
    title,
    twitter: {
      card: poster ? "summary_large_image" : "summary",
      description,
      images: poster ? [poster] : [],
      title,
    },
  };
}

export default async function MoviePage({
  params,
}: MoviePageProps): Promise<JSX.Element> {
  const id = parseMovieId((await params).id);
  if (id === null) notFound();

  const result = await getMovieDetails(id);
  if (!result.success) {
    if (result.error.kind === "not_found") notFound();
    throw new Error(`Movie ${id} is unavailable (${result.error.kind})`);
  }

  const awards = getMovieAwards(id).then((outcome) =>
    outcome.success ? outcome.data : null,
  );

  return (
    <>
      <MoviePageChrome movie={result.data} />
      <MovieView awards={awards} movie={result.data} />
    </>
  );
}
