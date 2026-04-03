'use client'

import { useEffect, useMemo } from 'react'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

import MediaCard from '@/features/shared/media-card'
import { TMDB_IMG } from '@/core/constants'
import { cn } from '@/core/utils'
import Icon from '@/ui/icon'
import AccountSectionLayout from '../section-layout'

const ITEMS_PER_PAGE = 36

function getMediaType(item) {
  const explicitType = item?.media_type || item?.entityType

  if (explicitType === 'movie') {
    return explicitType
  }

  return null
}

function getMediaTitle(item) {
  return item?.title || item?.original_title || 'Untitled'
}

function getMediaYear(item) {
  return item?.release_date?.slice?.(0, 4) || null
}

function getMediaPoster(item) {
  if (item?.poster_path_full) {
    return item.poster_path_full
  }

  if (item?.poster_path) {
    return `${TMDB_IMG}/w342${item.poster_path}`
  }

  return null
}

export function buildAccountCollectionPageHref(basePath, pageNumber) {
  if (!basePath) {
    return ''
  }

  if (basePath.includes('?')) {
    const [pathname, search = ''] = basePath.split('?')
    const params = new URLSearchParams(search)

    if (pageNumber <= 1) {
      params.delete('page')
    } else {
      params.set('page', String(pageNumber))
    }

    const query = params.toString()
    return query ? `${pathname}?${query}` : pathname
  }

  if (pageNumber <= 1) {
    return basePath
  }

  return `${basePath}/page/${pageNumber}`
}

function getPaginationItems(currentPage, totalPages) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1)
  }

  const items = [1]
  const start = Math.max(2, currentPage - 1)
  const end = Math.min(totalPages - 1, currentPage + 1)

  if (start > 2) {
    items.push('start-ellipsis')
  }

  for (let page = start; page <= end; page += 1) {
    items.push(page)
  }

  if (end < totalPages - 1) {
    items.push('end-ellipsis')
  }

  items.push(totalPages)

  return items
}

export default function AccountMediaGridPage({
  currentPage = 1,
  emptyMessage = 'No items yet',
  icon = 'solar:heart-bold',
  items = [],
  pageBasePath,
  renderHeaderAction = null,
  renderOverlay = null,
  title,
}) {
  const router = useRouter()

  const cards = useMemo(() => {
    return items
      .map((item) => {
        const mediaType = getMediaType(item)
        const detailId = item?.entityId || item?.id

        if (!detailId || mediaType !== 'movie') {
          return null
        }

        const mediaTitle = getMediaTitle(item)
        const year = getMediaYear(item)

        return {
          href: `/${mediaType}/${detailId}`,
          id: item?.mediaKey || `${mediaType}-${detailId}`,
          imageAlt: mediaTitle,
          imageSrc: getMediaPoster(item),
          item,
          tooltipText: year ? `${mediaTitle} (${year})` : mediaTitle,
        }
      })
      .filter(Boolean)
  }, [items])

  const totalPages = cards.length ? Math.ceil(cards.length / ITEMS_PER_PAGE) : 0
  const activePage = totalPages ? Math.min(currentPage, totalPages) : 1
  const pageStart = (activePage - 1) * ITEMS_PER_PAGE
  const visibleCards = cards.slice(pageStart, pageStart + ITEMS_PER_PAGE)
  const paginationItems = getPaginationItems(activePage, totalPages)

  useEffect(() => {
    if (!totalPages || currentPage <= totalPages || !pageBasePath) {
      return
    }

    router.replace(buildAccountCollectionPageHref(pageBasePath, totalPages))
  }, [currentPage, pageBasePath, router, totalPages])

  return (
    <AccountSectionLayout
      icon={icon}
      summaryLabel={
        cards.length === 0
          ? '0 items'
          : `${pageStart + 1}-${Math.min(
              pageStart + ITEMS_PER_PAGE,
              cards.length
            )} of ${cards.length}`
      }
      title={title}
      action={
        typeof renderHeaderAction === 'function' ? renderHeaderAction() : null
      }
    >
      {cards.length === 0 ? (
        <div className="border border-white/5 p-4 text-sm text-white/70">
          {emptyMessage}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {visibleCards.map((card, index) => (
              <MediaCard
                key={`${card.id}-${pageStart + index}`}
                href={card.href}
                className="w-full"
                imageSrc={card.imageSrc}
                imageAlt={card.imageAlt}
                imageSizes="(max-width: 767px) 33vw, (max-width: 1023px) 25vw, 16vw"
                fallbackIconClassName="text-white/50"
                topOverlay={
                  typeof renderOverlay === 'function'
                    ? renderOverlay(card.item)
                    : null
                }
                tooltipText={card.tooltipText}
              />
            ))}
          </div>

          {totalPages > 1 ? (
            <div className="flex flex-wrap items-center justify-end gap-2">
              {activePage > 1 ? (
                <Link
                  href={buildAccountCollectionPageHref(pageBasePath, activePage - 1)}
                  className="center size-12 surface-muted text-xs font-semibold transition"
                >
                  <Icon size={16} icon="solar:skip-previous-bold" />
                </Link>
              ) : null}

              {paginationItems.map((item, index) =>
                typeof item === 'number' ? (
                  <Link
                    key={item}
                    href={buildAccountCollectionPageHref(pageBasePath, item)}
                    aria-current={item === activePage ? 'page' : undefined}
                    className={cn(
                      'center size-12 border text-xs font-semibold transition',
                      item === activePage
                        ? 'surface-active'
                        : 'surface-muted'
                    )}
                  >
                    {item}
                  </Link>
                ) : (
                  <span key={`${item}-${index}`} className="text-xs text-white">
                    ...
                  </span>
                )
              )}

              {activePage < totalPages ? (
                <Link
                  href={buildAccountCollectionPageHref(pageBasePath, activePage + 1)}
                  className="center size-12 surface-muted text-xs font-semibold transition"
                >
                  <Icon size={16} icon="solar:skip-next-bold" />
                </Link>
              ) : null}
            </div>
          ) : null}
        </>
      )}
    </AccountSectionLayout>
  )
}
