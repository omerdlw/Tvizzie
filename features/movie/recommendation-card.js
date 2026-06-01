'use client';

import { motion } from 'framer-motion';

import { getSurfaceItemMotion, useInitialItemRevealEnabled } from '@/app/(media)/movie/[id]/motion';
import MediaCard from '@/ui/media/media-card';
import { TMDB_IMG } from '@/core/constants';
import { getMediaDetailPath, getMediaReleaseDate, getMediaTitle, resolveExplicitMediaType } from '@/core/utils/media';
import { getPreferredMoviePosterSrc, usePosterPreferenceVersion } from '@/features/media/poster-overrides';

export default function RecommendationCard({ movie, index = 0, imagePriority = false, imageFetchPriority }) {
  usePosterPreferenceVersion();
  const shouldAnimateItemReveal = useInitialItemRevealEnabled();
  const mediaType = resolveExplicitMediaType(movie, 'movie');
  const resolvedTitle = getMediaTitle(movie);
  const year = getMediaReleaseDate(movie)?.slice(0, 4);
  const tooltipText = year ? `${resolvedTitle} (${year})` : resolvedTitle;
  const cardMotion = getSurfaceItemMotion({
    enabled: shouldAnimateItemReveal,
    index,
    delayStep: 0.075,
    distance: 24,
    duration: 0.9,
    scale: 0.968,
  });

  return (
    <motion.div
      initial={cardMotion.initial}
      animate={cardMotion.animate}
      transition={cardMotion.transition}
      whileHover={{ y: -3 }}
    >
      <MediaCard
        imageSrc={
          (mediaType === 'movie' ? getPreferredMoviePosterSrc(movie, 'w342') : null) ||
          (movie.poster_path ? `${TMDB_IMG}/w342${movie.poster_path}` : null)
        }
        imageFetchPriority={imageFetchPriority}
        imagePriority={imagePriority}
        imagePreset="poster"
        href={getMediaDetailPath({ entityId: movie.id, entityType: mediaType })}
        tooltipText={tooltipText}
        imageAlt={resolvedTitle}
        className="w-full"
      />
    </motion.div>
  );
}
