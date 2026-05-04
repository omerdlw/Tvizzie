'use client';

import MediaCard from '@/ui/media/media-card';
import { TMDB_IMG } from '@/core/constants';
import { getPreferredMoviePosterSrc, usePosterPreferenceVersion } from '@/features/media/poster-overrides';

export default function RecommendationCard({ movie, imagePriority = false, imageFetchPriority }) {
  usePosterPreferenceVersion();
  const resolvedTitle = movie.title || movie.original_title || 'Untitled';
  const year = movie.release_date?.slice(0, 4);
  const tooltipText = year ? `${resolvedTitle} (${year})` : resolvedTitle;

  return (
    <div>
      <MediaCard
        imageSrc={
          getPreferredMoviePosterSrc(movie, 'w342') ||
          (movie.poster_path ? `${TMDB_IMG}/w342${movie.poster_path}` : null)
        }
        imageFetchPriority={imageFetchPriority}
        imagePriority={imagePriority}
        imagePreset="poster"
        href={`/movie/${movie.id}`}
        tooltipText={tooltipText}
        imageAlt={resolvedTitle}
        className="w-full"
      />
    </div>
  );
}
