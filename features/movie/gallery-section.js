'use client';

import { motion } from 'framer-motion';

import { MovieSurfaceReveal, getSurfaceItemMotion, useMovieSurfaceRevealState } from '@/app/(media)/movie/[id]/motion';
import Carousel from '@/ui/media/carousel';
import MediaCard from '@/ui/media/media-card';
import { TMDB_IMG } from '@/core/constants';
import { useModal } from '@/core/modules/modal/context';

function GallerySectionContent({ images }) {
  const surfaceReveal = useMovieSurfaceRevealState();
  const { openModal } = useModal();

  return (
    <section className="movie-detail-section-content w-full">
      <h2 className="text-xs font-semibold tracking-widest text-white/70 uppercase">Gallery</h2>
      <Carousel gap="gap-3">
        {images.map((image, index) => {
          const cardMotion = getSurfaceItemMotion({
            active: surfaceReveal.isActive,
            enabled: surfaceReveal.shouldAnimateItems,
            index,
            delayStep: 0.12,
            distance: 30,
            duration: 1.18,
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
                className="movie-carousel-feature-card"
                data-backdrop-file-path={image.file_path || ''}
                data-context-menu-target="movie-backdrop-card"
              />
            </motion.div>
          );
        })}
      </Carousel>
    </section>
  );
}

export default function GallerySection({ images }) {
  if (!images?.length) {
    return null;
  }

  return (
    <MovieSurfaceReveal>
      <GallerySectionContent images={images} />
    </MovieSurfaceReveal>
  );
}
