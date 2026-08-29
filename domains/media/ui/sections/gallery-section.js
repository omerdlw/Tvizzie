'use client';

import Carousel from '@/ui/components/media-carousel';
import MediaCard from '@/ui/components/media-card';
import { TMDB_IMG } from '@/shared';
import { useModal } from '@/modules/modal';
import Icon from '@/ui/primitives/icon';
import {
  MEDIA_DETAIL_SECTION_CONTENT_CLASS,
  MEDIA_DETAIL_SECTION_HEADER_CLASS,
} from '@/domains/media/ui/layouts/media-detail-section';

export default function GallerySection({ images, type = 'movie' }) {
  const { openModal } = useModal();

  const isPerson = type === 'person' || Boolean(images?.profiles && !images?.backdrops);
  const rawList = isPerson ? images?.profiles || images : images?.backdrops || images;

  const normalizedImages = Array.isArray(rawList) ? rawList : [];

  if (!normalizedImages.length) {
    return null;
  }

  return (
    <section className="relative flex w-full flex-col">
      <div className={MEDIA_DETAIL_SECTION_HEADER_CLASS}>
        <div className="flex min-w-0 items-center gap-2.5">
          <Icon icon="solar:gallery-wide-bold" size={20} className="text-white/70" />
          <h2 className="min-w-0 text-xs font-semibold text-white/70 uppercase">Gallery</h2>
        </div>
      </div>

      <div className={MEDIA_DETAIL_SECTION_CONTENT_CLASS}>
        <Carousel arrowPlacement="inset" gap="gap-3">
          {normalizedImages.map((image, index) => {
            if (isPerson) {
              return (
                <div key={image.file_path || index} className="shrink-0 rounded-[20px]">
                  <MediaCard
                    imageSrc={image.file_path ? `${TMDB_IMG}/w342${image.file_path}` : null}
                    onClick={() =>
                      openModal('PREVIEW_MODAL', 'center', {
                        data: image,
                      })
                    }
                    imagePreset="poster"
                    fallbackIcon="solar:user-rounded-bold"
                    imageAlt={`Portrait ${index + 1}`}
                    aspectClass="aspect-2/3"
                    fallbackIconSize={24}
                    imageSizes="(max-width: 640px) 144px, 176px"
                    className="w-36 sm:w-44"
                    data-poster-file-path={image.file_path || ''}
                    data-context-menu-target="person-poster-card"
                  />
                </div>
              );
            }

            return (
              <div key={image.file_path || index} className="shrink-0 rounded-[20px]">
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
              </div>
            );
          })}
        </Carousel>
      </div>
    </section>
  );
}
