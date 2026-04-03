'use client'

import { Reorder, useDragControls } from 'framer-motion'

import MediaPosterCard from '@/features/shared/media-poster-card'
import { getMediaTitle } from '@/features/account/utils'
import { DURATION } from '@/core/constants'
import Icon from '@/ui/icon/index'

function ReorderableListItem({ item, renderEditAction }) {
  const controls = useDragControls()

  return (
    <Reorder.Item
      as="div"
      value={item}
      dragListener={false}
      dragControls={controls}
      className="relative w-full"
    >
      <div className="flex w-full items-center gap-2 border border-white/5  px-4 py-3">
        <div
          onPointerDown={(e) => controls.start(e)}
          className="center size-8 shrink-0 cursor-grab text-white/60 transition hover:text-white active:cursor-grabbing"
        >
          <Icon icon="solar:reorder-bold" size={18} />
        </div>
        <p className="min-w-0 flex-1 truncate text-sm font-semibold text-white">
          {getMediaTitle(item)}
        </p>
        {typeof renderEditAction === 'function' ? (
          <div className="shrink-0">{renderEditAction(item)}</div>
        ) : null}
      </div>
    </Reorder.Item>
  )
}

export function MediaGrid({
  items,
  onReorder = null,
  editMode = false,
  renderEditAction = null,
  renderOverlay = null,
}) {
  if (editMode) {
    return (
      <Reorder.Group
        as="div"
        axis="y"
        values={items}
        onReorder={typeof onReorder === 'function' ? onReorder : () => {}}
        className="list-none space-y-2"
      >
        {items.map((item, index) => (
          <ReorderableListItem
            key={`${item.id || item.mediaKey || item.entityId || 'media-item'}-${index}`}
            item={item}
            renderEditAction={renderEditAction}
          />
        ))}
      </Reorder.Group>
    )
  }

  return (
    <div className="stagger-container grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:gap-3">
      {items.map((item, index) => (
        <div
          key={`${item.id || item.mediaKey || item.entityId || 'media-item'}-${index}`}
          className="fade-up relative w-full"
          style={{ '--delay': `${index * DURATION.STAGGER}s` }}
        >
          <MediaPosterCard item={item} className="w-full" />
          {typeof renderOverlay === 'function' ? renderOverlay(item) : null}
        </div>
      ))}
    </div>
  )
}
