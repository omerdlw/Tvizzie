'use client'

import { TMDB_IMG } from '@/lib/constants'
import { cn } from '@/lib/utils'
import Icon from '@/ui/icon'

function getPreviewImage(item) {
  if (item?.poster_path_full) {
    return item.poster_path_full
  }

  if (item?.poster_path) {
    return `${TMDB_IMG}/w342${item.poster_path}`
  }

  return null
}

export default function ListPreviewComposition({
  className = '',
  emptyIcon = 'solar:list-heart-bold',
  imageClassName = 'h-full w-full object-cover',
  items = [],
}) {
  const previewItems = Array.isArray(items) ? items.slice(0, 3) : []

  return (
    <div
      className={cn(
        'grid h-full w-full grid-cols-3 overflow-hidden border border-white/5 ',
        className
      )}
    >
      {previewItems.length > 0 ? (
        previewItems.map((item, index) => (
          <div
            key={
              item.mediaKey ||
              `${item.entityType || 'movie'}-${item.entityId || item.id || index}-${index}`
            }
            className="h-full overflow-hidden border-r border-white/5 last:border-r-0"
          >
            {getPreviewImage(item) ? (
              <img
                src={getPreviewImage(item)}
                alt={item.title || item.name || 'Poster'}
                className={imageClassName}
              />
            ) : (
              <div className="center h-full w-full  text-white/35">
                <Icon icon="solar:videocamera-record-bold" size={16} />
              </div>
            )}
          </div>
        ))
      ) : (
        <div className="center col-span-3 h-full w-full text-white/35">
          <Icon icon={emptyIcon} size={20} />
        </div>
      )}
    </div>
  )
}
