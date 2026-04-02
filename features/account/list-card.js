'use client'

import { useMemo, useState } from 'react'

import Link from 'next/link'

import { motion } from 'framer-motion'

import { TMDB_IMG } from '@/lib/constants'
import Icon from '@/ui/icon'

const CARD_SCALE = 1.24
const BACK_PANEL_HEIGHT = Math.round(224 * CARD_SCALE)
const POSTER_WIDTH = Math.round(100 * CARD_SCALE)
const POSTER_HEIGHT = Math.round(160 * CARD_SCALE)
const POSTER_SPREAD = 160 * CARD_SCALE
const STACK_SIZE = 5

function getPreviewImage(item) {
  if (item?.poster_path_full) {
    return item.poster_path_full
  }

  if (item?.poster_path) {
    return `${TMDB_IMG}/w342${item.poster_path}`
  }

  return null
}

function getListHref(list) {
  const ownerHandle = list?.ownerSnapshot?.username || list?.ownerId

  if (!ownerHandle || !list?.slug) {
    return '#'
  }

  return `/account/${ownerHandle}/lists/${list.slug}`
}

function formatListDate(value) {
  if (!value) {
    return 'Recently updated'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'Recently updated'
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(date)
}

function getPosterMetrics(index, count, isHovered) {
  const centerIndex = (count - 1) / 2
  const distance = index - centerIndex
  const depth = Math.abs(distance)
  const totalSpread = POSTER_SPREAD
  const step = count > 1 ? totalSpread / (count - 1) : 0
  const startX = -totalSpread / 2
  const baseX = count > 1 ? startX + step * index : 0
  const normalizedPosition = count > 1 ? (index / (count - 1)) * 2 - 1 : 0
  const baseRotate = normalizedPosition * 10
  const yOffset = (-16 * CARD_SCALE * (1 - depth / Math.max(centerIndex, 1))) || 0
  const baseScale = depth === 0 ? 1.05 : depth === 1 ? 0.95 : 0.88

  return {
    brightness:
      depth === 0
        ? 1
        : depth === 1
          ? (isHovered ? 0.74 : 0.55)
          : (isHovered ? 0.48 : 0.3),
    rotate: isHovered ? baseRotate * 1.3 : baseRotate,
    scale: isHovered ? baseScale * 1.02 : baseScale,
    x: isHovered ? baseX * 1.4 : baseX,
    y: isHovered ? -8 * CARD_SCALE + yOffset : 8 * CARD_SCALE + yOffset,
    zIndex: 10 - depth,
  }
}

function PreviewPoster({ index, isHovered, item, total }) {
  const imageSrc = getPreviewImage(item)
  const { brightness, rotate, scale, x, y, zIndex } = getPosterMetrics(
    index,
    total,
    isHovered
  )

  return (
    <motion.div
      className="absolute left-1/2 top-0"
      initial={false}
      animate={{
        x: `calc(-50% + ${x}px)`,
        y,
        rotate,
        scale,
      }}
      transition={{
        type: 'spring',
        stiffness: 110,
        damping: 18,
        mass: 0.95,
      }}
      style={{ zIndex }}
    >
      <div
        className="overflow-hidden border border-white/10"
        style={{
          height: `${POSTER_HEIGHT}px`,
          width: `${POSTER_WIDTH}px`,
        }}
      >
        {imageSrc ? (
          <motion.img
            src={imageSrc}
            alt={item.title || item.name || 'Poster'}
            className="h-full w-full object-cover"
            initial={false}
            animate={{
              filter: `brightness(${brightness}) contrast(1.08) saturate(${1 - Math.abs(index - (total - 1) / 2) * 0.2}) blur(${isHovered ? 0 : Math.abs(index - (total - 1) / 2) * 0.75}px)`,
            }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          />
        ) : (
          <div className="center h-full w-full bg-white/5 text-white/25">
            <Icon icon="solar:videocamera-record-bold" size={20} />
          </div>
        )}
      </div>
    </motion.div>
  )
}

function PlaceholderPoster({ index, isHovered, total }) {
  const { rotate, scale, x, y, zIndex } = getPosterMetrics(
    index,
    total,
    isHovered
  )

  return (
    <motion.div
      className="absolute left-1/2 top-0"
      initial={false}
      animate={{
        x: `calc(-50% + ${x}px)`,
        y,
        rotate,
        scale,
      }}
      transition={{
        type: 'spring',
        stiffness: 110,
        damping: 18,
        mass: 0.95,
      }}
      style={{ zIndex }}
    >
      <div
        className="border border-dashed border-white/10 "
        style={{
          height: `${POSTER_HEIGHT}px`,
          width: `${POSTER_WIDTH}px`,
        }}
      />
    </motion.div>
  )
}

function buildPreviewSlots(previewItems) {
  const items = Array.isArray(previewItems) ? previewItems.slice(0, STACK_SIZE) : []
  const placeholdersBefore = Math.floor((STACK_SIZE - items.length) / 2)
  const slots = Array.from({ length: STACK_SIZE }, () => null)

  items.forEach((item, index) => {
    slots[placeholdersBefore + index] = item
  })

  return slots
}

export default function AccountListCard({ list, renderActions = null }) {
  const [isHovered, setIsHovered] = useState(false)

  const previewItems = useMemo(
    () => (Array.isArray(list?.previewItems) ? list.previewItems.slice(0, STACK_SIZE) : []),
    [list?.previewItems]
  )
  const previewSlots = useMemo(() => buildPreviewSlots(previewItems), [previewItems])
  const updatedLabel = formatListDate(list?.updatedAt || list?.createdAt)

  return (
    <motion.article
      className="relative w-full"
      initial={false}
      animate={{
        scale: isHovered ? 1.045 : 1,
        y: isHovered ? -8 : 0,
      }}
      transition={{
        type: 'spring',
        stiffness: 220,
        damping: 22,
        mass: 0.9,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Link href={getListHref(list)} className="block">
        <div
          className="relative w-full"
          style={{
            perspective: '1200px',
          }}
        >
          <motion.div
            className="relative z-0 border border-white/5 bg-white/5"
            initial={false}
            animate={{
              rotateX: isHovered ? 15 : 0,
            }}
            transition={{
              type: 'spring',
              stiffness: 180,
              damping: 22,
              mass: 0.85,
            }}
            style={{
              height: `${BACK_PANEL_HEIGHT}px`,
              transformOrigin: 'center bottom',
              transformStyle: 'preserve-3d',
            }}
          >
            <motion.div
              className="absolute inset-0"
              initial={false}
              animate={{
                rotateX: isHovered ? -15 : 0,
              }}
              transition={{
                type: 'spring',
                stiffness: 180,
                damping: 22,
                mass: 0.85,
              }}
              style={{
                transformOrigin: 'center bottom',
                transformStyle: 'flat',
              }}
            >
              {previewSlots.map((item, index) =>
                item ? (
                  <PreviewPoster
                    key={item.mediaKey || `${item.entityType}-${item.entityId}-${index}`}
                    index={index}
                    isHovered={isHovered}
                    item={item}
                    total={previewSlots.length}
                  />
                ) : (
                  <PlaceholderPoster
                    key={`placeholder-${index}`}
                    index={index}
                    isHovered={isHovered}
                    total={previewSlots.length}
                  />
                )
              )}
            </motion.div>
          </motion.div>

          <motion.div
            className="absolute bottom-0 left-0 right-0 z-10 overflow-hidden rounded-2xl border border-white/5 /70"
            initial={false}
            animate={{
              rotateX: isHovered ? -25 : 0,
            }}
            transition={{
              type: 'spring',
              stiffness: 170,
              damping: 22,
              mass: 0.85,
            }}
            style={{
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              transformOrigin: 'center bottom',
              transformStyle: 'preserve-3d',
            }}
          >
            <div className="relative min-h-[92px] px-4 py-4">
              <h3 className="min-h-[2.75rem] line-clamp-2 text-[18px] leading-[1.22] font-semibold text-white">
                {list?.title || 'Untitled List'}
              </h3>
            </div>

            <div className="relative h-12 border-t border-white/8">
              <div className="absolute inset-0 flex items-center justify-between px-2 text-[14px] text-white/58">
                <div className="flex items-center gap-1.5 whitespace-nowrap">
                  <span>{list?.itemsCount || 0} films</span>
                </div>

                <div className="flex min-w-0 items-center gap-2">
                  <span className="truncate">{updatedLabel}</span>
                  {typeof renderActions === 'function' ? (
                    <div
                      className="shrink-0"
                      onClick={(event) => {
                        event.preventDefault()
                        event.stopPropagation()
                      }}
                    >
                      {renderActions(list)}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </Link>
    </motion.article>
  )
}
