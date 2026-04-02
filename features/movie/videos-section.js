'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import Carousel from '@/features/shared/carousel'
import MediaCard from '@/features/shared/media-card'
import SegmentedControl from '@/features/shared/segmented-control'
import { useModal } from '@/modules/modal/context'
import Icon from '@/ui/icon'

function getAvailableTypes(videos) {
  return [...new Set((videos || []).map((video) => video.type).filter(Boolean))]
}

function getSegmentItems(types) {
  return types.map((type) => ({
    key: type,
    label: type.endsWith('s') ? type : `${type}s`,
  }))
}

export default function VideosSection({ videos }) {
  const { openModal } = useModal()
  const availableTypes = useMemo(() => getAvailableTypes(videos), [videos])
  const [activeType, setActiveType] = useState(() => availableTypes[0] || null)

  useEffect(() => {
    if (!availableTypes.length) {
      setActiveType(null)
      return
    }

    if (!availableTypes.includes(activeType)) {
      setActiveType(availableTypes[0])
    }
  }, [activeType, availableTypes])

  const filteredVideos = useMemo(() => {
    if (!activeType) {
      return []
    }

    return (videos || []).filter((video) => video.type === activeType)
  }, [videos, activeType])

  const handleTypeChange = useCallback((type) => {
    setActiveType(type)
  }, [])

  if (!videos?.length) {
    return null
  }

  return (
    <section className="flex w-full flex-col gap-3">
      <SegmentedControl
        items={getSegmentItems(availableTypes)}
        value={activeType}
        onChange={handleTypeChange}
      />
      <Carousel gap="gap-3">
        {filteredVideos.map((video) => {
          const thumbnailUrl = `https://img.youtube.com/vi/${video.key}/hqdefault.jpg`

          return (
            <MediaCard
              key={video.id}
              className="w-72"
              aspectClass="aspect-video"
              imageSrc={thumbnailUrl}
              imageAlt={video.name}
              imageSizes="288px"
              imageClassName="object-cover transition-transform duration-(--motion-duration-normal) group-hover:scale-105"
              fallbackIcon="solar:video-library-bold"
              fallbackIconSize={24}
              overlay={
                <>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="center size-8 backdrop-blur-sm border border-white/10 bg-black/70 text-white transition-transform duration-(--motion-duration-normal) group-hover:scale-110">
                      <Icon icon="solar:play-bold" size={16} />
                    </div>
                  </div>
                  <div className="absolute inset-x-0 bottom-0 truncate p-2 text-xs font-semibold leading-snug text-white  drop-shadow-sm drop-shadow-white/40">
                    {video.name}
                  </div>
                </>
              }
              onClick={() =>
                openModal('VIDEO_PREVIEW_MODAL', 'center', { data: video })
              }
            />
          )
        })}
      </Carousel>
    </section>
  )
}
