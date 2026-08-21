'use client';

import MediaCard from '@/ui/components/media-card';
import { TMDB_IMG } from '@/shared/constants';
import { getMediaDetailPath, resolveExplicitMediaType } from '@/domains/media/utils/media-key';
import { getMediaReleaseDate, getMediaTitle } from '@/domains/media/utils/media-data';
import {
  getPreferredMoviePosterSrc,
  usePosterPreferenceVersion,
} from '@/domains/media/utils/poster-preferences';

export default function RecommendationCard({
  movie,
  imagePriority = false,
  imageFetchPriority,
  imageLoading,
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
      imageLoading={imageLoading}
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
