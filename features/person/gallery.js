'use client';

import { useMemo } from 'react';

import Carousel from '@/ui/media/carousel';
import MediaCard from '@/ui/media/media-card';
import { TMDB_IMG } from '@/core/constants';
import { useModal } from '@/core/modules/modal/context';

function sortProfiles(profiles = []) {
  return [...profiles]
    .filter((image) => image?.file_path)
    .sort(
      (first, second) =>
        (second.vote_average || 0) - (first.vote_average || 0) || (second.vote_count || 0) - (first.vote_count || 0)
    )
    .slice(0, 20);
}

export default function PersonGallery({ images }) {
  const { openModal } = useModal();
  const profiles = useMemo(() => sortProfiles(images?.profiles || []), [images]);

  if (!profiles.length) return null;

  return (
    <div className="w-full">
      <PersonGallerySurface profiles={profiles} openModal={openModal} />
    </div>
  );
}

function PersonGallerySurface({ profiles, openModal }) {
  return (
    <section className="flex w-full flex-col gap-3">
      <h2 className="text-xs font-semibold tracking-widest text-white/70 uppercase">Gallery</h2>

      <Carousel gap="gap-3">
        {profiles.map((image, index) => {
          return (
            <div key={image.file_path || index}>
              <MediaCard
                className="person-gallery-card sm:w-60"
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
            </div>
          );
        })}
      </Carousel>
    </section>
  );
}
