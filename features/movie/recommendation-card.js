'use client';

import { motion } from 'framer-motion';

import { getSurfaceItemMotion, useInitialItemRevealEnabled } from '@/app/(media)/movie/[id]/motion';
import MediaCard from '@/ui/media/media-card';
import { TMDB_IMG } from '@/core/constants';
import { getPreferredMoviePosterSrc, usePosterPreferenceVersion } from '@/features/media/poster-overrides';

export default function RecommendationCard({ movie, index = 0, imagePriority = false, imageFetchPriority }) {
  usePosterPreferenceVersion();
  const shouldAnimateItemReveal = useInitialItemRevealEnabled();
  const resolvedTitle = movie.title || movie.original_title || 'Untitled';
  const year = movie.release_date?.slice(0, 4);
  const tooltipText = year ? `${resolvedTitle} (${year})` : resolvedTitle;
  const cardMotion = getSurfaceItemMotion({
    enabled: shouldAnimateItemReveal,
    index,
    distance: 20,
    scale: 0.978,
  });

  return (
    <motion.div initial={cardMotion.initial} animate={cardMotion.animate} transition={cardMotion.transition}>
      <MediaCard
        imageSrc={getPreferredMoviePosterSrc(movie, 'w342') || (movie.poster_path ? `${TMDB_IMG}/w342${movie.poster_path}` : null)}
        imageFetchPriority={imageFetchPriority}
        imagePriority={imagePriority}
        imagePreset="poster"
        href={`/movie/${movie.id}`}
        tooltipText={tooltipText}
        imageAlt={resolvedTitle}
        className="w-full"
      />
    </motion.div>
  );
}
