'use client';

import Carousel from '@/domains/media/ui/components/media-carousel';
import MediaCard from '@/domains/media/ui/components/media-card';
import { TMDB_IMG } from '@/shared/constants';
import { useModal } from '@/modules/modal';
import Icon from '@/ui/primitives/icon';
import {
  MEDIA_DETAIL_SECTION_CONTENT_CLASS,
  MEDIA_DETAIL_SECTION_HEADER_CLASS,
} from '@/domains/media/ui/layouts/media-detail-section';
import { MediaRouteReveal } from '@/app/(media)/motion';
export default function GallerySection({ images, baseDelay = 0 }) {
  const { openModal } = useModal();
  if (!images?.length) {
    return null;
  }

  return (
    <section className="relative w-full border-b border-white/10">
      <div className={MEDIA_DETAIL_SECTION_HEADER_CLASS}>
        <div className="flex min-w-0 items-center gap-2">
          <Icon icon="solar:gallery-wide-bold" size={20} className="text-white/70" />
          <h2 className="min-w-0 text-xs font-semibold tracking-wide text-white/70 uppercase">
            Gallery
          </h2>
        </div>
      </div>

      <div className={MEDIA_DETAIL_SECTION_CONTENT_CLASS}>
        <Carousel gap="gap-3">
          {images.map((image, index) => {
            return (
              <MediaRouteReveal
                key={image.file_path || index}
                stage="items.gallery"
                deferred
                interactive
                itemIndex={index}
              >
                <MediaCard
                  imageSrc={image.file_path ? `${TMDB_IMG}/original${image.file_path}` : null}
                  onClick={() =>
                    openModal('PREVIEW_MODAL', 'center', {
                      data: image,
                    })
                  }
                  imagePreset="feature"
                  fallbackIcon="solar:panorama-bold"
                  imageAlt={`Scene ${index + 1}`}
                  aspectClass="aspect-video"
                  fallbackIconSize={24}
                  imageSizes="288px"
                  className="w-[min(18rem,calc(100vw-4.5rem))] sm:w-72"
                  data-backdrop-file-path={image.file_path || ''}
                  data-context-menu-target="movie-backdrop-card"
                />
              </MediaRouteReveal>
            );
          })}
        </Carousel>
      </div>
    </section>
  );
}
