'use client';

import { useMemo } from 'react';

import { motion, useReducedMotion } from 'framer-motion';
import Carousel from '@/features/shared/carousel';
import MediaCard from '@/features/shared/media-card';
import { TMDB_IMG } from '@/core/constants';
import { useModal } from '@/core/modules/modal/context';
import { getSurfaceItemMotion } from '@/features/movie/movie-motion';

function sortProfiles(profiles = []) {
  return [...profiles]
    .filter((image) => image?.file_path)
    .sort(
      (first, second) =>
        (second.vote_average || 0) - (first.vote_average || 0) || (second.vote_count || 0) - (first.vote_count || 0)
    )
    .slice(0, 20);
}

export default function PersonGallery({ images, animateItemReveal = true }) {
  const reduceMotion = useReducedMotion();
  const { openModal } = useModal();
  const profiles = useMemo(() => sortProfiles(images?.profiles || []), [images]);

  if (!profiles.length) return null;

  return (
    <section className="flex w-full flex-col gap-3">
      <h2 className="text-[11px] font-semibold tracking-widest text-black/70 uppercase">Gallery</h2>

      <Carousel gap="gap-3">
        {profiles.map((image, index) => {
          const cardMotion = getSurfaceItemMotion({
            enabled: animateItemReveal,
            reduceMotion,
            index,
            distance: 16,
            scale: 0.98,
          });

          return (
            <motion.div
              key={image.file_path || index}
              initial={cardMotion.initial}
              animate={cardMotion.animate}
              transition={cardMotion.transition}
            >
              <MediaCard
                className="w-[min(14rem,calc(100vw-4.5rem))] sm:w-60"
                aspectClass="aspect-2/3"
                imageSrc={image.file_path ? `${TMDB_IMG}/w342${image.file_path}` : null}
                imageAlt={`${index + 1}. portrait`}
                imageSizes="(min-width: 1024px) 240px, (min-width: 768px) 31vw, 38vw"
                imagePriority={index < 4}
                imageFetchPriority={index < 4 ? 'high' : undefined}
                imagePreset="feature"
                fallbackIcon="solar:user-bold"
                fallbackIconSize={24}
                onClick={() => openModal?.('PREVIEW_MODAL', 'center', { data: image })}
                data-poster-file-path={image.file_path || ''}
                data-context-menu-target="person-poster-card"
              />
            </motion.div>
          );
        })}
      </Carousel>
    </section>
  );
}
