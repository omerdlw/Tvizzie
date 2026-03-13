'use client'

import { useState } from 'react'

import Image from 'next/image'

import Carousel from '@/components/shared/carousel'
import { TMDB_IMG } from '@/lib/constants'
import { cn } from '@/lib/utils'
import Icon from '@/ui/icon'

const STYLES = Object.freeze({
  frame:
    'relative w-full overflow-hidden rounded-[20px] bg-white/5 p-1 ring ring-white/10 transition-all duration-[var(--motion-duration-normal)] group-hover:bg-white/10 group-hover:ring-white/15',
  inner: 'relative h-full w-full overflow-hidden rounded-[16px]',
  sectionTitle: 'text-xs font-semibold tracking-widest text-white/50 uppercase',
})

function PhotoCard({ image, index, openModal }) {
  const [hasError, setHasError] = useState(false)
  const hasPath = image.file_path && !hasError

  return (
    <div
      onClick={() => openModal?.('PREVIEW_MODAL', 'center', { data: image })}
      className={cn(
        STYLES.frame,
        'group aspect-2/3 w-[calc((100%-16px)/3)] shrink-0 cursor-pointer lg:w-[calc((100%-32px)/5)]'
      )}
    >
      <div className={cn(STYLES.inner, 'bg-white/5')}>
        {hasPath ? (
          <Image
            src={`${TMDB_IMG}/w342${image.file_path}`}
            alt={`Photo ${index + 1}`}
            fill
            draggable={false}
            onError={() => setHasError(true)}
            className="pointer-events-none object-cover transition-transform duration-[var(--motion-duration-normal)] group-hover:scale-105"
            sizes="(min-width: 1024px) 220px, (min-width: 768px) 31vw, 33vw"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Icon icon="solar:user-bold" size={24} className="text-white/50" />
          </div>
        )}
      </div>
    </div>
  )
}

export default function PersonGallery({ images, openModal }) {
  const profiles = images?.profiles || []
  if (!profiles.length) return null

  return (
    <div className="flex w-full flex-col gap-3">
      <h2 className={STYLES.sectionTitle}>Photos</h2>
      <Carousel gap="gap-2">
        {profiles.map((image, index) => (
          <PhotoCard
            key={image.file_path || index}
            image={image}
            index={index}
            openModal={openModal}
          />
        ))}
      </Carousel>
    </div>
  )
}
