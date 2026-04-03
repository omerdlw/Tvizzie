'use client'

import { useEffect, useMemo } from 'react'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

import AccountListCard from './list-card'
import AccountSectionLayout from '../section-layout'
import { buildAccountCollectionPageHref } from '../sections/media-grid-page'

const ITEMS_PER_PAGE = 36

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

export default function AccountPaginatedListGrid({
  currentPage = 1,
  emptyMessage = 'No lists yet',
  icon = 'solar:list-broken',
  isLoading = false,
  lists = [],
  loadError = null,
  pageBasePath,
  renderActions = null,
  renderHeaderAction = null,
  title,
}) {
  const router = useRouter()

  const totalPages = lists.length ? Math.ceil(lists.length / ITEMS_PER_PAGE) : 0
  const activePage = totalPages ? Math.min(currentPage, totalPages) : 1
  const pageStart = (activePage - 1) * ITEMS_PER_PAGE
  const visibleLists = useMemo(
    () => lists.slice(pageStart, pageStart + ITEMS_PER_PAGE),
    [lists, pageStart]
  )
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
        lists.length === 0
          ? '0 total'
          : `${pageStart + 1}-${Math.min(
              pageStart + ITEMS_PER_PAGE,
              lists.length
            )} of ${lists.length}`
      }
      title={title}
      action={
        typeof renderHeaderAction === 'function' ? renderHeaderAction() : null
      }
    >

        {isLoading && lists.length === 0 ? (
          <div className="border border-white/5 p-4 text-sm text-white/70">
            Loading lists...
          </div>
        ) : lists.length === 0 ? (
          <div className="border border-white/5 p-4 text-sm text-white/70">
            {loadError || emptyMessage}
          </div>
        ) : (
          <>
            <div className="grid w-full grid-cols-1 gap-x-6 gap-y-10 md:grid-cols-2 xl:grid-cols-3">
              {visibleLists.map((list) => (
                <AccountListCard
                  key={`${list.ownerId || list.ownerSnapshot?.id || 'owner'}-${list.id}`}
                  layout="grid"
                  list={list}
                  renderActions={renderActions}
                />
              ))}
            </div>

            {totalPages > 1 ? (
              <div className="flex flex-wrap items-center justify-end gap-2">
                {paginationItems.map((item, index) =>
                  typeof item === 'number' ? (
                    <Link
                      key={item}
                      href={buildAccountCollectionPageHref(pageBasePath, item)}
                      aria-current={item === activePage ? 'page' : undefined}
                      className={
                        item === activePage
                          ? 'center size-12  border border-white/5  text-xs font-semibold text-white transition'
                          : 'center size-12  border border-white/5  text-xs font-semibold text-white transition hover: hover:text-white'
                      }
                    >
                      {item}
                    </Link>
                  ) : (
                    <span key={`${item}-${index}`} className="text-xs text-white">
                      ...
                    </span>
                  )
                )}
              </div>
            ) : null}
          </>
        )}
    </AccountSectionLayout>
  )
}
