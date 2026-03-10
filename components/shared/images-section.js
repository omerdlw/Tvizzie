'use client'

import { useCallback, useMemo, useState } from 'react'

import Image from 'next/image'

import Carousel from '@/components/shared/carousel'
import { useModal } from '@/modules/modal/context'
import Icon from '@/ui/icon'

const TMDB_IMG = 'https://image.tmdb.org/t/p'

const TABS = [
  {
    aspect: 'aspect-video',
    label: 'Backdrops',
    key: 'backdrops',
    width: 'w-72',
  },
  { key: 'posters', label: 'Posters', aspect: 'aspect-2/3', width: 'w-36' },
  { key: 'logos', label: 'Logos', aspect: 'aspect-video', width: 'w-52' },
]

const PLACEHOLDER_ICONS = {
  posters: 'solar:gallery-minimalistic-bold',
  logos: 'solar:bookmark-square-bold',
  backdrops: 'solar:panorama-bold',
}

const SIZE_MAP = {
  backdrops: 'w780',
  posters: 'w342',
  logos: 'w500',
}

function ImageCard({ image, index, tab }) {
  const { openModal } = useModal()
  const [hasError, setHasError] = useState(false)
  const hasPath = image.file_path && !hasError
  const isLogo = tab.key === 'logos'

  return (
    <div
      className={`relative ${tab.aspect} ${tab.width} group shrink-0 cursor-pointer rounded-[20px] bg-white/5 p-1 ring ring-white/10 backdrop-blur-sm transition-all duration-300 hover:bg-white/10 hover:ring-white/15`}
      onClick={() => openModal('PREVIEW_MODAL', 'center', { data: image })}
      onDragStart={(e) => e.preventDefault()}
    >
      <div className="relative h-full w-full overflow-hidden rounded-[16px] bg-white/5">
        {hasPath ? (
          <Image
            className={`pointer-events-none transition-transform duration-300 group-hover:scale-105 ${isLogo ? 'object-contain p-4' : 'object-cover'}`}
            src={`${TMDB_IMG}/${SIZE_MAP[tab.key]}${image.file_path}`}
            sizes={tab.key === 'backdrops' ? '288px' : '144px'}
            alt={`${tab.label} ${index + 1}`}
            onError={() => setHasError(true)}
            draggable={false}
            fill
          />
        ) : (
          <div className="center h-full w-full">
            <Icon
              icon={PLACEHOLDER_ICONS[tab.key]}
              className="text-white/50"
              size={24}
            />
          </div>
        )}
      </div>
    </div>
  )
}

export default function ImagesSection({ images }) {
  const availableTabs = useMemo(
    () => TABS.filter((tab) => images?.[tab.key]?.length > 0),
    [images]
  )

  const [activeKey, setActiveKey] = useState(availableTabs[0]?.key)

  const currentTab = useMemo(
    () =>
      availableTabs.find((tab) => tab.key === activeKey) || availableTabs[0],
    [activeKey, availableTabs]
  )

  const items = useMemo(
    () => images?.[currentTab?.key] || [],
    [images, currentTab]
  )

  const handleTabChange = useCallback((key) => {
    setActiveKey(key)
  }, [])

  if (!availableTabs.length) return null

  return (
    <div className="flex w-full flex-col gap-3">
      <div className="flex items-center">
        <div className="flex items-center gap-1 rounded-[12px] bg-white/5 p-0.5 ring-1 ring-white/10 backdrop-blur-sm">
          {availableTabs.map((tab) => (
            <button
              className={`cursor-pointer rounded-[10px] px-3 py-1 text-xs font-medium transition-all duration-200 ${
                activeKey === tab.key
                  ? 'bg-white/10'
                  : 'text-white/50 hover:text-white/70'
              }`}
              onClick={() => handleTabChange(tab.key)}
              key={tab.key}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      <Carousel gap="gap-3">
        {items.map((image, index) => (
          <ImageCard
            key={image.file_path || index}
            tab={currentTab}
            image={image}
            index={index}
          />
        ))}
      </Carousel>
    </div>
  )
}
