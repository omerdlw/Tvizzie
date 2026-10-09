import type { JSX } from "react";
import type { MovieDetails } from "@/infrastructure/tmdb/types";
import { POSTER_ROW_ITEM } from "../lib/layout";
import { getRecommendations } from "../lib/utils";
import { MoviePosterLink } from "./movie-poster-link";
import { Carousel, Section } from "../stage";
import { MovieSectionHeader } from "./movie-section";

export function MovieRecommendations({
  movie,
}: {
  movie: MovieDetails;
}): JSX.Element | null {
  const recommendations = getRecommendations(movie);
  if (recommendations.length === 0) return null;

  return (
    <Section className="flex w-full flex-col">
      <MovieSectionHeader
        icon="solar:stars-minimalistic-bold"
        title="More like this"
      />
      <Carousel itemClassName={POSTER_ROW_ITEM} label="More like this">
        {recommendations.map((item) => (
          <MoviePosterLink
            key={item.id}
            caption={false}
            original
            movie={{
              id: item.id,
              posterPath: item.posterPath,
              title: item.title,
              year: item.releaseYear,
            }}
            sizes="(min-width: 768px) 22vw, 30vw"
          />
        ))}
      </Carousel>
    </Section>
  );
}
