'use client';

import Carousel from '@/features/shared/carousel';
import MediaCard from '@/features/shared/media-card';
import { TMDB_IMG } from '@/core/constants';
import { useModal } from '@/core/modules/modal/context';

export default function GallerySection({ images }) {
  const { openModal } = useModal();

  if (!images?.length) {
    return null;
  }

  return (
    <section className="flex w-full flex-col gap-3">
      <h2 className="text-[11px] font-semibold tracking-widest text-black/70 uppercase">Gallery</h2>
      <Carousel gap="gap-3">
        {images.map((image, index) => (
          <MediaCard
            imageSrc={image.file_path ? `${TMDB_IMG}/w780${image.file_path}` : null}
            onClick={() => openModal('PREVIEW_MODAL', 'center', { data: image })}
            imageFetchPriority={index < 3 ? 'high' : undefined}
            fallbackIcon="solar:panorama-bold"
            imageAlt={`Scene ${index + 1}`}
            key={image.file_path || index}
            aspectClass="aspect-video"
            imagePriority={index < 3}
            fallbackIconSize={24}
            imageSizes="288px"
            className="w-72"
            data-backdrop-file-path={image.file_path || ''}
            data-context-menu-target="movie-backdrop-card"
          />
        ))}
      </Carousel>
    </section>
  );
}
