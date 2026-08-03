'use client';

import MediaCard from '@/domains/media/ui/components/media-card';
import { TMDB_IMG } from '@/shared/constants';
import { getMediaDetailPath, getMediaReleaseDate, getMediaTitle, resolveExplicitMediaType } from '@/domains/media/utils';
import {
  getPreferredMoviePosterSrc,
  usePosterPreferenceVersion,
} from '@/domains/media/ui/poster-overrides';

export default function RecommendationCard({
  movie,
  imagePriority = false,
  imageFetchPriority,
}) {
  usePosterPreferenceVersion();
  const mediaType = resolveExplicitMediaType(movie, 'movie');
  const resolvedTitle = getMediaTitle(movie);
  const year = getMediaReleaseDate(movie)?.slice(0, 4);
  const tooltipText = year ? `${resolvedTitle} (${year})` : resolvedTitle;

  return (
    <MediaCard
      imageSrc={
        (mediaType === 'movie' ? getPreferredMoviePosterSrc(movie, 'w342') : null) ||
        (movie.poster_path ? `${TMDB_IMG}/w342${movie.poster_path}` : null)
      }
      imageFetchPriority={imageFetchPriority}
      imagePriority={imagePriority}
      imagePreset="poster"
      href={getMediaDetailPath({
        entityId: movie.id,
        entityType: mediaType,
      })}
      tooltipText={tooltipText}
      imageAlt={resolvedTitle}
      className="w-full"
    />
  );
}
