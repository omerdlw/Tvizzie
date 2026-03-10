'use client'

import { useState } from 'react'

import Image from 'next/image'

import Carousel from '@/components/shared/carousel'
import Icon from '@/ui/icon'

const TMDB_IMG = 'https://image.tmdb.org/t/p'

function PhotoCard({ image, index, openModal }) {
  const [hasError, setHasError] = useState(false)
  const hasPath = image.file_path && !hasError

  return (
    <div
      onClick={() => openModal?.('PREVIEW_MODAL', 'center', { data: image })}
      className="group relative aspect-2/3 w-[calc((100%-32px)/5)] shrink-0 cursor-pointer rounded-[20px] bg-white/5 p-1 ring ring-white/10 transition-all duration-300 hover:bg-white/10 hover:ring-white/15"
    >
      <div className="relative h-full w-full overflow-hidden rounded-[16px] bg-white/5">
        {hasPath ? (
          <Image
            src={`${TMDB_IMG}/w342${image.file_path}`}
            alt={`Photo ${index + 1}`}
            fill
            draggable={false}
            onError={() => setHasError(true)}
            className="pointer-events-none object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="144px"
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
      <h2 className="text-xs font-semibold tracking-widest text-white/50 uppercase">
        Photos
      </h2>
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
