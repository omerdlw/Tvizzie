'use client';

import { motion } from 'framer-motion';

import Carousel from '@/ui/media/carousel';
import MediaCard from '@/ui/media/media-card';
import { TMDB_IMG } from '@/core/constants';
import { useModal } from '@/core/modules/modal/context';
import { getMovieFeatureItemMotion, MOVIE_FEATURE_SECTION_MOTION } from '@/features/movie/motion';

function GallerySectionContent({ images }) {
  const { openModal } = useModal();

  return (
    <motion.section className="movie-detail-section-content w-full" {...MOVIE_FEATURE_SECTION_MOTION}>
      <motion.h2 className="text-xs font-semibold tracking-widest text-white/70 uppercase" {...getMovieFeatureItemMotion(0)}>
        Gallery
      </motion.h2>
      <Carousel gap="gap-3">
        {images.map((image, index) => {
          return (
            <motion.div key={image.file_path || index} {...getMovieFeatureItemMotion(index + 1)}>
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
    </motion.section>
  );
}

export default function GallerySection({ images }) {
  if (!images?.length) {
    return null;
  }

  return (
    <div className="w-full">
      <GallerySectionContent images={images} />
    </div>
  );
}
