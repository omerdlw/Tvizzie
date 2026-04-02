'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import Carousel from '@/features/shared/carousel'
import MediaCard from '@/features/shared/media-card'
import SegmentedControl from '@/features/shared/segmented-control'
import { TMDB_IMG } from '@/lib/constants'
import { useModal } from '@/modules/modal/context'

const TABS = Object.freeze([
  {
    key: 'backdrops',
    label: 'Backdrops',
    aspect: 'aspect-video',
    width: 'w-72',
  },
  { key: 'posters', label: 'Posters', aspect: 'aspect-2/3', width: 'w-36' },
  { key: 'logos', label: 'Logos', aspect: 'aspect-video', width: 'w-52' },
])

const PLACEHOLDER_ICONS = Object.freeze({
  backdrops: 'solar:panorama-bold',
  posters: 'solar:gallery-minimalistic-bold',
  logos: 'solar:bookmark-square-bold',
})

const SIZE_MAP = Object.freeze({
  backdrops: 'w780',
  posters: 'w342',
  logos: 'w500',
})

function getAvailableTabs(images) {
  return TABS.filter((tab) => {
    const rawItems = images?.[tab.key] || []

    if (tab.key === 'backdrops') {
      return rawItems.some((image) => image.iso_639_1)
    }

    return rawItems.length > 0
  })
}

export default function ImagesSection({ images }) {
  const { openModal } = useModal()
  const availableTabs = useMemo(() => getAvailableTabs(images), [images])
  const [activeKey, setActiveKey] = useState(() => availableTabs[0]?.key || null)

  useEffect(() => {
    if (!availableTabs.length) {
      setActiveKey(null)
      return
    }

    if (!availableTabs.some((tab) => tab.key === activeKey)) {
      setActiveKey(availableTabs[0].key)
    }
  }, [availableTabs, activeKey])

  const currentTab = useMemo(
    () => availableTabs.find((tab) => tab.key === activeKey) || availableTabs[0],
    [availableTabs, activeKey]
  )

  const items = useMemo(() => {
    if (!currentTab) {
      return []
    }

    const allItems = images?.[currentTab.key] || []

    if (currentTab.key === 'backdrops') {
      return allItems.filter((image) => image.iso_639_1)
    }

    return allItems
  }, [images, currentTab])

  const handleTabChange = useCallback((key) => {
    setActiveKey(key)
  }, [])

  if (!availableTabs.length || !currentTab) {
    return null
  }

  return (
    <section className="flex w-full flex-col gap-3">
      <SegmentedControl
        items={availableTabs}
        value={activeKey}
        onChange={handleTabChange}
      />

      <Carousel gap="gap-3">
        {items.map((image, index) => {
          const imageSrc = image.file_path
            ? `${TMDB_IMG}/${SIZE_MAP[currentTab.key]}${image.file_path}`
            : null
          const imageSizes =
            currentTab.key === 'backdrops'
              ? '288px'
              : currentTab.key === 'posters'
                ? '144px'
                : '208px'

          return (
            <MediaCard
              key={image.file_path || index}
              className={`shrink-0 ${currentTab.width}`}
              aspectClass={currentTab.aspect}
              imageSrc={imageSrc}
              imageAlt={`${currentTab.label} ${index + 1}`}
              imageSizes={imageSizes}
              imagePriority={index < 3}
              imageFetchPriority={index < 3 ? 'high' : undefined}
              imageClassName={
                currentTab.key === 'logos'
                  ? 'object-contain p-4'
                  : 'object-cover'
              }
              fallbackIcon={PLACEHOLDER_ICONS[currentTab.key]}
              fallbackIconSize={24}
              onClick={() => openModal('PREVIEW_MODAL', 'center', { data: image })}
            />
          )
        })}
      </Carousel>
    </section>
  )
}
