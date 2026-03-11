'use client'

import { useCallback, useMemo, useState } from 'react'

import Image from 'next/image'

import Carousel from '@/components/shared/carousel'
import { useModal } from '@/modules/modal/context'
import Icon from '@/ui/icon'

function VideoCard({ video }) {
  const { openModal } = useModal()
  const thumbnailUrl = `https://img.youtube.com/vi/${video.key}/hqdefault.jpg`

  return (
    <div
      className="group relative aspect-video w-72 shrink-0 cursor-pointer rounded-[20px] bg-white/5 p-1 ring ring-white/10 backdrop-blur-sm transition-all duration-300 hover:bg-white/10 hover:ring-white/15"
      onClick={() =>
        openModal('VIDEO_PREVIEW_MODAL', 'center', { data: video })
      }
      onDragStart={(e) => e.preventDefault()}
    >
      <div className="relative h-full w-full overflow-hidden rounded-[16px] bg-white/5">
        <Image
          className="pointer-events-none object-cover transition-transform duration-300 group-hover:scale-105"
          src={thumbnailUrl}
          draggable={false}
          alt={video.name}
          sizes="288px"
          fill
        />
        <div className="center absolute inset-0 bg-black/20 transition-colors group-hover:bg-black/10">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 ring ring-white/15 backdrop-blur-sm transition-transform group-hover:scale-110">
            <Icon
              className="ml-1 text-white"
              icon="solar:play-bold"
              size={24}
            />
          </div>
        </div>
        <div className="absolute right-3 bottom-3 left-3 truncate text-[10px] font-medium text-white/70 drop-shadow-md">
          {video.name}
        </div>
      </div>
    </div>
  )
}

export default function VideosSection({ videos }) {
  const availableTypes = useMemo(() => {
    return [...new Set(videos?.map((video) => video.type))]
  }, [videos])

  const [activeType, setActiveType] = useState(availableTypes[0])

  const filteredVideos = useMemo(
    () => videos?.filter((video) => video.type === activeType) || [],
    [videos, activeType]
  )

  const handleTypeChange = useCallback((type) => {
    setActiveType(type)
  }, [])

  if (!videos?.length) return null

  return (
    <div className="flex w-full flex-col gap-3">
      <div className="flex items-center gap-3">
        <div className="hide-scrollbar flex items-center gap-1 overflow-x-auto rounded-[12px] bg-white/5 p-0.5 ring ring-white/10 backdrop-blur-lg">
          {availableTypes.map((type) => (
            <button
              className={`cursor-pointer rounded-[10px] px-3 py-1 text-xs font-medium whitespace-nowrap transition-all duration-200 ${
                activeType === type
                  ? 'bg-white/10'
                  : 'text-white/50 hover:text-white/70'
              }`}
              onClick={() => handleTypeChange(type)}
              key={type}
            >
              {type.endsWith('s') ? type : `${type}s`}
            </button>
          ))}
        </div>
      </div>
      <Carousel gap="gap-3">
        {filteredVideos.map((video) => (
          <VideoCard key={video.id} video={video} />
        ))}
      </Carousel>
    </div>
  )
}
