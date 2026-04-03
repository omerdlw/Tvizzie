'use client'

import { useMemo, useState } from 'react'

import MediaCard from '@/features/shared/media-card'
import { TMDB_IMG } from '@/core/constants'
import { cn } from '@/core/utils'
import { Button } from '@/ui/elements'
import Icon from '@/ui/icon'
import AccountSectionLayout from '../section-layout'

const OVERVIEW_ROW_CARD_LIMIT = 5

function getFavoriteType(item) {
  const explicitType = item?.media_type || item?.entityType

  if (explicitType === 'movie') {
    return explicitType
  }

  return null
}

function getFavoriteTitle(item) {
  return item?.title || item?.original_title || 'Untitled'
}

function getFavoriteYear(item) {
  return item?.release_date?.slice?.(0, 4) || null
}

function getFavoritePoster(item) {
  if (item?.poster_path_full) {
    return item.poster_path_full
  }

  if (item?.poster_path) {
    return `${TMDB_IMG}/w342${item.poster_path}`
  }

  return null
}

export default function AccountFavoritesSection({
  emptyMessage = 'No favorites showcase yet',
  icon = 'solar:star-bold',
  isOwner = false,
  items = [],
  onRemoveItem,
  renderOverlay = null,
  showSeeMore = false,
  title = 'Favorites Showcase',
  titleHref = null,
  summaryLabel = null,
}) {
  const [pendingItemId, setPendingItemId] = useState(null)

  const cards = useMemo(
    () =>
      items
        .map((item) => {
          const mediaType = getFavoriteType(item)
          const detailId = item?.entityId || item?.id

          if (!detailId || mediaType !== 'movie') {
            return null
          }

          const title = getFavoriteTitle(item)
          const year = getFavoriteYear(item)

          return {
            href: `/${mediaType}/${detailId}`,
            id: item?.mediaKey || `${mediaType}-${detailId}`,
            imageAlt: title,
            imageSrc: getFavoritePoster(item),
            item,
            tooltipText: year ? `${title} (${year})` : title,
          }
        })
        .filter(Boolean),
    [items]
  )

  return (
    <AccountSectionLayout
      icon={icon}
      showSeeMore={showSeeMore}
      summaryLabel={summaryLabel}
      title={title}
      titleHref={titleHref}
    >
      {cards.length > 0 ? (
        <div className="flex gap-3 overflow-hidden">
          {cards.slice(0, OVERVIEW_ROW_CARD_LIMIT).map((card, index) => (
            <div
              key={`${card.id}-${index}`}
              className={cn(
                'shrink-0 basis-[calc((100%-24px)/3)] lg:basis-[calc((100%-48px)/5)]',
                index >= 3 && 'hidden lg:block'
              )}
            >
              <MediaCard
                className="w-full md:w-full lg:w-full"
                imageSizes="(max-width: 767px) 33vw, (max-width: 1023px) 25vw, 20vw"
                imageSrc={card.imageSrc}
                imageAlt={card.imageAlt}
                href={card.href}
                fallbackIconClassName="text-white/50"
                topOverlay={
                  typeof renderOverlay === 'function' ? (
                    renderOverlay(card.item)
                  ) : isOwner && typeof onRemoveItem === 'function' ? (
                    <div className="absolute inset-x-0 top-0 flex justify-end p-2">
                      <Button
                        aria-label={`Remove ${card.imageAlt} from favorites showcase`}
                        variant="destructive-icon"
                        disabled={pendingItemId === card.id}
                        onClick={async (event) => {
                          event.preventDefault()
                          event.stopPropagation()

                          if (pendingItemId === card.id) {
                            return
                          }

                          setPendingItemId(card.id)

                          try {
                            await onRemoveItem(card.item)
                          } finally {
                            setPendingItemId((currentId) =>
                              currentId === card.id ? null : currentId
                            )
                          }
                        }}
                      >
                        <Icon
                          className={pendingItemId === card.id ? 'animate-pulse' : ''}
                          icon="solar:trash-bin-trash-bold"
                          size={16}
                        />
                      </Button>
                    </div>
                  ) : null
                }
                tooltipText={card.tooltipText}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="border border-white/5 p-4 text-sm text-white/70">
          {emptyMessage}
        </div>
      )}
    </AccountSectionLayout>
  )
}
