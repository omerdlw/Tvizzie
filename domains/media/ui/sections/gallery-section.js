'use client';

import Carousel from '@/domains/shell/shared/components/media-carousel';
import MediaCard from '@/domains/shell/shared/components/media-card';
import { TMDB_IMG } from '@/domains/shell/shared/constants';
import { useModal } from '@/modules/modal';
import Icon from '@/ui/primitives/icon';
import {
  MEDIA_DETAIL_SECTION_CONTENT_CLASS,
  MEDIA_DETAIL_SECTION_HEADER_CLASS,
} from '@/domains/media/ui/layouts/media-detail-section';
import { GridCrosshair, GridShellCrosshairs } from '@/domains/shell/layout/grid-crosshair';

export default function GallerySection({ images, type = 'movie', fullBleed = false }) {
  const { openModal } = useModal();

  const isPerson = type === 'person' || Boolean(images?.profiles && !images?.backdrops);
  const rawList = isPerson
    ? images?.profiles || images
    : images?.backdrops || images;

  const normalizedImages = Array.isArray(rawList) ? rawList : [];

  if (!normalizedImages.length) {
    return null;
  }

  return (
    <section className="relative w-full">
      <div className={MEDIA_DETAIL_SECTION_HEADER_CLASS}>
        <div className="flex min-w-0 items-center gap-2">
          <Icon icon="solar:gallery-wide-bold" size={20} className="text-white/70" />
          <h2 className="min-w-0 text-xs font-semibold tracking-wide text-white/70 uppercase">
            Gallery
          </h2>
        </div>
        {fullBleed ? (
          <div className="pointer-events-none absolute bottom-0 left-1/2 h-px w-screen -translate-x-1/2 bg-white/10 backdrop-blur-sm">
            <GridShellCrosshairs />
          </div>
        ) : (
          <div className="pointer-events-none absolute right-px bottom-0 left-px h-px bg-white/10 backdrop-blur-sm">
            <GridCrosshair side="left" />
            <GridCrosshair side="right" />
          </div>
        )}
      </div>

      <div className={MEDIA_DETAIL_SECTION_CONTENT_CLASS}>
        <Carousel gap="gap-3">
          {normalizedImages.map((image, index) => {
            if (isPerson) {
              return (
                <div key={image.file_path || index} className="shrink-0">
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
              <div key={image.file_path || index} className="shrink-0">
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
      <div className="pointer-events-none absolute right-px bottom-0 left-px h-px bg-white/10 backdrop-blur-sm">
        <GridCrosshair side="left" />
        <GridCrosshair side="right" />
      </div>
    </section>
  );
}
