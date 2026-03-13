'use client'

import { Reorder, useDragControls } from 'framer-motion'

import ContentCard from '@/components/home/content-card'
import { DURATION } from '@/lib/constants'
import Icon from '@/ui/icon/index'

function ReorderableItem({ item, index, renderOverlay }) {
  const controls = useDragControls()

  return (
    <Reorder.Item
      value={item}
      dragListener={false}
      dragControls={controls}
      className="relative w-full"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: DURATION.NORMAL,
        delay: index * DURATION.STAGGER,
      }}
    >
      <div className="relative h-full w-full">
        <ContentCard
          item={item}
          className="w-full transition-transform duration-[var(--motion-duration-moderate)] hover:scale-[1.02]"
        />

        {/* Drag Handle */}
        <div
          onPointerDown={(e) => controls.start(e)}
          className="absolute top-2 left-2 z-20 flex size-9 cursor-grab items-center justify-center rounded-xl bg-black/60 text-white shadow-lg backdrop-blur-sm transition-all hover:bg-black/80 active:scale-90 active:cursor-grabbing"
        >
          <Icon icon="solar:reorder-bold" size={18} />
        </div>

        {typeof renderOverlay === 'function' ? renderOverlay(item) : null}
      </div>
    </Reorder.Item>
  )
}

export function MediaGrid({
  items,
  onReorder = null,
  canReorder = false,
  renderOverlay = null,
}) {
  if (canReorder && typeof onReorder === 'function') {
    return (
      <Reorder.Group
        as="div"
        axis="y" // Reorder.Group requires axis, but grid is tricky. y works best for vertical movement in grid flow.
        values={items}
        onReorder={onReorder}
        className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:gap-6"
      >
        {items.map((item, index) => (
          <ReorderableItem
            key={item.id || item.mediaKey || index}
            item={item}
            index={index}
            renderOverlay={renderOverlay}
          />
        ))}
      </Reorder.Group>
    )
  }

  return (
    <div className="stagger-container mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:gap-6">
      {items.map((item, index) => (
        <div
          key={item.id || item.mediaKey || index}
          className="fade-up relative w-full"
          style={{ '--delay': `${index * DURATION.STAGGER}s` }}
        >
          <ContentCard
            item={item}
            className="w-full transition-transform duration-[var(--motion-duration-moderate)] hover:scale-[1.03]"
          />
          {typeof renderOverlay === 'function' ? renderOverlay(item) : null}
        </div>
      ))}
    </div>
  )
}
