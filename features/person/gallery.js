'use client'

import { useMemo } from 'react'

import Carousel from '@/features/shared/carousel'
import MediaCard from '@/features/shared/media-card'
import { TMDB_IMG } from '@/core/constants'
import { useModal } from '@/core/modules/modal/context'

function sortProfiles(profiles = []) {
  return [...profiles]
    .filter((image) => image?.file_path)
    .sort(
      (first, second) =>
        (second.vote_average || 0) - (first.vote_average || 0) ||
        (second.vote_count || 0) - (first.vote_count || 0)
    )
    .slice(0, 20)
}

export default function PersonGallery({ images }) {
  const { openModal } = useModal()
  const profiles = useMemo(
    () => sortProfiles(images?.profiles || []),
    [images]
  )

  if (!profiles.length) return null

  return (
    <div className="flex w-full flex-col gap-2">
      <h2 className="text-xs font-semibold tracking-widest text-white/50 uppercase">
        Gallery
      </h2>

      <Carousel gap="gap-3">
        {profiles.map((image, index) => (
          <MediaCard
            key={image.file_path || index}
            className="w-52 sm:w-56 md:w-60"
            aspectClass="aspect-2/3"
            imageSrc={
              image.file_path ? `${TMDB_IMG}/w342${image.file_path}` : null
            }
            imageAlt={`${index + 1}. portrait`}
            imageSizes="(min-width: 1024px) 240px, (min-width: 768px) 31vw, 40vw"
            imagePriority={index < 4}
            imageFetchPriority={index < 4 ? 'high' : undefined}
            fallbackIcon="solar:user-bold"
            fallbackIconSize={24}
            onClick={() =>
              openModal?.('PREVIEW_MODAL', 'center', { data: image })
            }
          />
        ))}
      </Carousel>
    </div>
  )
}
