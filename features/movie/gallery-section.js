'use client';

import { motion } from 'framer-motion';

import { MovieSurfaceReveal, getSurfaceItemMotion, useInitialItemRevealEnabled } from '@/app/(media)/movie/[id]/motion';
import Carousel from '@/ui/media/carousel';
import MediaCard from '@/ui/media/media-card';
import { TMDB_IMG } from '@/core/constants';
import { useModal } from '@/core/modules/modal/context';

export default function GallerySection({ images }) {
  const shouldAnimateItemReveal = useInitialItemRevealEnabled();
  const { openModal } = useModal();

  if (!images?.length) {
    return null;
  }

  return (
    <MovieSurfaceReveal>
      <section className="flex w-full flex-col gap-3">
        <h2 className="text-[11px] font-semibold tracking-widest text-black/70 uppercase">Gallery</h2>
        <Carousel gap="gap-3">
          {images.map((image, index) => {
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
                key={image.file_path || index}
                initial={cardMotion.initial}
                animate={cardMotion.animate}
                transition={cardMotion.transition}
                whileHover={{ y: -3 }}
              >
                <MediaCard
                  imageSrc={image.file_path ? `${TMDB_IMG}/w780${image.file_path}` : null}
                  onClick={() => openModal('PREVIEW_MODAL', 'center', { data: image })}
                  imageFetchPriority={index < 3 ? 'high' : undefined}
                  imagePreset="feature"
                  fallbackIcon="solar:panorama-bold"
                  imageAlt={`Scene ${index + 1}`}
                  aspectClass="aspect-video"
                  imagePriority={index < 3}
                  fallbackIconSize={24}
                  imageSizes="288px"
                  className="w-[min(18rem,calc(100vw-4.5rem))] sm:w-72"
                  data-backdrop-file-path={image.file_path || ''}
                  data-context-menu-target="movie-backdrop-card"
                />
              </motion.div>
            );
          })}
        </Carousel>
      </section>
    </MovieSurfaceReveal>
  );
}
