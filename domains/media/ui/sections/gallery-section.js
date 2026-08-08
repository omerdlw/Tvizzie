'use client';

import { motion } from 'framer-motion';
import Carousel from '@/domains/media/ui/components/media-carousel';
import MediaCard from '@/domains/media/ui/components/media-card';
import { TMDB_IMG } from '@/shared/constants';
import { useModal } from '@/modules/modal';
import {
  getCarouselButtonProps,
  getMediaCardProps,
  getSectionHeaderProps,
  TIMELINES,
} from '@/app/(media)/motion';

export default function GallerySection({
  images,
  baseDelay = TIMELINES.GALLERY_SECTION_BASE_DELAY,
}) {
  const { openModal } = useModal();
  if (!images?.length) {
    return null;
  }

  return (
    <section className="flex w-full flex-col gap-3">
      <motion.h2
        {...getSectionHeaderProps(baseDelay, false, 'gallery')}
        className="text-[11px] font-semibold tracking-widest text-black/70 uppercase"
      >
        Gallery
      </motion.h2>
      <Carousel gap="gap-3" buttonProps={getCarouselButtonProps(baseDelay)}>
        {images.map((image, index) => {
          return (
            <motion.div
              key={image.file_path || index}
              {...getMediaCardProps(index, baseDelay, false, 'gallery')}
            >
              <MediaCard
                imageSrc={image.file_path ? `${TMDB_IMG}/w780${image.file_path}` : null}
                onClick={() =>
                  openModal('PREVIEW_MODAL', 'center', {
                    data: image,
                  })
                }
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
  );
}
