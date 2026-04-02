'use client'

import Carousel from '@/features/shared/carousel'
import MediaCard from '@/features/shared/media-card'
import { TMDB_IMG } from '@/lib/constants'
import { useModal } from '@/modules/modal/context'

export default function GallerySection({ images }) {
  const { openModal } = useModal()

  if (!images?.length) {
    return null
  }

  return (
    <section className="flex w-full flex-col gap-3">
      <h2 className="text-[11px] font-semibold tracking-widest text-white/50 uppercase">
        Gallery
      </h2>
      <Carousel gap="gap-3">
        {images.map((image, index) => (
          <MediaCard
            key={image.file_path || index}
            className="w-72"
            aspectClass="aspect-video"
            imageSrc={
              image.file_path ? `${TMDB_IMG}/w780${image.file_path}` : null
            }
            imageAlt={`Scene ${index + 1}`}
            imageSizes="288px"
            imagePriority={index < 3}
            imageFetchPriority={index < 3 ? 'high' : undefined}
            fallbackIcon="solar:panorama-bold"
            fallbackIconSize={24}
            onClick={() => openModal('PREVIEW_MODAL', 'center', { data: image })}
          />
        ))}
      </Carousel>
    </section>
  )
}
