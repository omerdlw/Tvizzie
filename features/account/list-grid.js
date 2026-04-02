'use client'

import AccountListCard from './list-card'
import AccountSectionLayout from './section-layout'

export default function AccountListGrid({
  emptyMessage = 'No lists yet',
  icon = 'solar:list-heart-bold',
  isLoading = false,
  lists = [],
  loadError = null,
  renderActions = null,
  showSeeMore = false,
  summaryLabel = null,
  title,
  titleHref = null,
}) {
  const resolvedSummaryLabel =
    summaryLabel === null ? `${lists.length} total` : summaryLabel

  return (
    <AccountSectionLayout
      icon={icon}
      showSeeMore={showSeeMore}
      summaryLabel={resolvedSummaryLabel}
      title={title}
      titleHref={titleHref}
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
          <div className="grid w-full grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {lists.map((list) => (
              <AccountListCard
                key={`${list.ownerId || list.ownerSnapshot?.id || 'owner'}-${list.id}`}
                list={list}
                renderActions={renderActions}
              />
            ))}
          </div>
        )}
    </AccountSectionLayout>
  )
}
