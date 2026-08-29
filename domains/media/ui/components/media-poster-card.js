'use client';

import { TMDB_IMG } from '@/shared';
import {
  getMediaDetailPath,
  isTitleMediaType,
  resolveExplicitMediaType,
} from '@/domains/media/utils/media-key';
import { getMediaReleaseDate, getMediaTitle } from '@/domains/media/utils/media-data';
import {
  getPreferredMoviePosterSrc,
  usePosterPreferenceVersion,
} from '@/domains/media/utils/poster-preferences';
import { cn } from '@/ui/class-names';
import MediaCard from '@/ui/components/media-card';

export default function MediaPosterCard({
  item,
  className = '',
  aspectSquare = false,
  imageLoading,
  imagePriority = false,
  imageFetchPriority,
  fallbackMediaType = 'movie',
}) {
  usePosterPreferenceVersion();
  const mediaType = resolveExplicitMediaType(item, fallbackMediaType);

  if (!isTitleMediaType(mediaType)) {
    return null;
  }

  const detailId = item.entityId || item.id;
  const title = getMediaTitle(item);
  const resolvedTitle = title || 'Untitled';
  const year = getMediaReleaseDate(item)?.slice(0, 4);
  const href = getMediaDetailPath({ entityId: detailId, entityType: mediaType });
  const imageSrc =
    getPreferredMoviePosterSrc(item, 'w342') ||
    (item.poster_path_full
      ? item.poster_path_full
      : item.poster_path
        ? `${TMDB_IMG}/w342${item.poster_path}`
        : null);
  const tooltipText = year ? `${resolvedTitle} (${year})` : resolvedTitle;

  return (
    <MediaCard
      href={href}
      className={cn('w-full', className)}
      aspectClass={aspectSquare ? 'aspect-square' : 'aspect-2/3'}
      imageSrc={imageSrc}
      imageAlt={resolvedTitle}
      imageSizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 16vw"
      imageLoading={imageLoading}
      imagePriority={imagePriority}
      imageFetchPriority={imageFetchPriority}
      imagePreset="poster"
      tooltipText={tooltipText}
    />
  );
}
