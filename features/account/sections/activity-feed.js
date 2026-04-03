'use client'

import Link from 'next/link'

import MediaCard from '@/features/shared/media-card'
import ListPreviewComposition from '@/features/shared/list-preview-composition'
import { TMDB_IMG } from '@/core/constants'
import { Button } from '@/ui/elements'
import Icon from '@/ui/icon'
import AccountSectionLayout from '../section-layout'

const EVENT_META = Object.freeze({
  FOLLOW_ACCEPTED: {
    action: 'accepted',
    icon: 'solar:users-group-rounded-bold',
  },
  FOLLOW_CREATED: {
    action: 'followed',
    icon: 'solar:user-plus-bold',
  },
  LIST_CREATED: {
    action: 'created',
    icon: 'solar:list-broken',
  },
  LIST_LIKED: {
    action: 'liked',
    icon: 'solar:heart-bold',
  },
  REVIEW_PUBLISHED: {
    action: 'reviewed',
    icon: 'solar:chat-round-bold',
  },
  WATCHED_MARKED: {
    action: 'watched',
    icon: 'solar:clapperboard-play-bold',
  },
  WATCHLIST_ADDED: {
    action: 'added',
    icon: 'solar:bookmark-bold',
  },
})

function formatActivityTime(value) {
  if (!value) return null

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return null
  }

  const diffMs = Date.now() - date.getTime()
  const diffMinutes = Math.max(0, Math.floor(diffMs / (60 * 1000)))

  if (diffMinutes < 1) {
    return 'now'
  }

  if (diffMinutes < 60) {
    return `${diffMinutes}m`
  }

  const diffHours = Math.floor(diffMinutes / 60)

  if (diffHours < 24) {
    return `${diffHours}h`
  }

  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays}d`
}

function getActivityText(item) {
  const actorName = item?.actor?.displayName || item?.actor?.username || 'Someone'
  const meta = EVENT_META[item?.eventType] || { action: 'updated' }
  const followStatus = String(item?.payload?.status || '').trim().toLowerCase()
  const action =
    item?.eventType === 'REVIEW_PUBLISHED' && item?.payload?.reviewMode === 'rating'
      ? 'rated'
      : item?.eventType === 'FOLLOW_CREATED' && followStatus === 'pending'
        ? 'requested to follow'
        : meta.action
  const subjectTitle = item?.subject?.title || 'something'

  return {
    actorName,
    action,
    subjectHref: item?.subject?.href || null,
    subjectTitle,
  }
}

function resolvePosterSrc(item) {
  const poster = String(item?.subject?.poster || '').trim()

  if (!poster) {
    return null
  }

  if (poster.startsWith('http://') || poster.startsWith('https://')) {
    return poster
  }

  if (poster.startsWith('/')) {
    return `${TMDB_IMG}/w342${poster}`
  }

  return poster
}

function CompactRating({ rating }) {
  const normalized = Number(rating)
  const clamped = Math.max(0.5, Math.min(5, normalized))

  if (!Number.isFinite(normalized) || normalized <= 0) {
    return null
  }

  return (
    <div className="inline-flex h-4" aria-label={`${normalized}/5`}>
      {Array.from({ length: Math.ceil(clamped) }, (_, index) => {
        const fill = Math.max(0, Math.min(1, clamped - index))

        return (
          <span key={index} className="relative size-4 shrink-0">
            <span className="absolute inset-0 text-white/20">
              <Icon icon="solar:star-bold" size={16} />
            </span>
            <span
              className="absolute inset-y-0 left-0 overflow-hidden text-success"
              style={{ width: `${fill * 100}%` }}
            >
              <span className="block size-4">
                <Icon icon="solar:star-bold" size={16} />
              </span>
            </span>
          </span>
        )
      })}
    </div>
  )
}

function ListPreviewStack({ item }) {
  const previewItems = Array.isArray(item?.activityState?.previewItems)
    ? item.activityState.previewItems.slice(0, 3)
    : []
  const subjectHref = item?.subject?.href || null
  const subjectTitle = item?.subject?.title || 'Untitled List'

  return (
    <Link
      href={subjectHref || '#'}
      className="group block aspect-2/3 w-full overflow-hidden border border-white/5 rounded-[12px]"
    >
      <ListPreviewComposition
        className="border-0 bg-transparent"
        imageClassName="h-full w-full object-cover transition-transform duration-(--motion-duration-normal) group-hover:scale-[1.02]"
        items={previewItems}
      />

      <span className="sr-only">{subjectTitle}</span>
    </Link>
  )
}

function ShowcaseItem({ item }) {
  const { subjectHref, subjectTitle } = getActivityText(item)
  const posterSrc = resolvePosterSrc(item)
  const activityState = item?.activityState || {}
  const activityMeta = EVENT_META[item?.eventType] || null
  const rating = Number(activityState.rating)
  const isWatchlistActivity = item?.eventType === 'WATCHLIST_ADDED'
  const isListActivity = item?.subject?.type === 'list'
  const showMovieCard = item?.subject?.type !== 'list'

  return (
    <div className="min-w-0">
      {showMovieCard ? (
        <MediaCard
          href={subjectHref}
          className="w-full"
          imageSrc={posterSrc}
          imageAlt={subjectTitle}
          imageSizes="(max-width: 767px) 50vw, (max-width: 1023px) 33vw, 25vw"
          fallbackIcon="solar:clapperboard-play-bold"
          fallbackIconClassName="text-white/50"
          tooltipText={subjectTitle}
        />
      ) : (
        <ListPreviewStack item={item} />
      )}

      <div className="mt-2 flex min-h-4 items-center gap-2 text-white/70">
        <CompactRating rating={rating} />
        {isListActivity && activityMeta?.action ? (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-white/70">
            {activityMeta?.icon ? <Icon icon={activityMeta.icon} size={14} /> : null}
            <span>{activityMeta.action}</span>
          </span>
        ) : null}
        {isWatchlistActivity ? (
          <Icon icon="solar:bookmark-bold" size={16} />
        ) : null}
        {activityState.isLiked ? (
          <Icon icon="solar:heart-bold" size={16} className="text-error" />
        ) : null}
        {activityState.hasReview ? (
          <Icon icon="solar:chat-round-bold" size={16} />
        ) : null}
        {activityState.isRewatch ? (
          <Icon icon="solar:refresh-bold" size={16} className="text-success" />
        ) : null}
      </div>
    </div>
  )
}

function ActivityItem({ isFirst = false, item, variant = 'feed' }) {
  const { actorName, action, subjectHref, subjectTitle } = getActivityText(item)
  const createdLabel = formatActivityTime(item?.updatedAt || item?.createdAt)
  const isShowcase = variant === 'showcase'

  return (
    <article
      className={
        isShowcase
          ? `border-b border-white/5 ${isFirst ? 'pb-4 pt-0' : 'py-4'} last:border-b-0`
          : `border-b border-white/5 ${isFirst ? 'pb-5 pt-0' : 'py-5'} last:border-b-0`
      }
    >
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
        <div className="min-w-0 text-[1.02rem] leading-7 text-white">
          <span className="font-semibold text-white">{actorName}</span>{' '}
          <span className="text-white">{action}</span>{' '}
          {subjectHref ? (
            <Link href={subjectHref} className="transition hover:text-white">
              {subjectTitle}
            </Link>
          ) : (
            <span>{subjectTitle}</span>
          )}
        </div>

        {createdLabel ? (
          <div className="shrink-0 text-sm font-medium text-white sm:pt-0.5">
            {createdLabel}
          </div>
        ) : null}
      </div>
    </article>
  )
}

export default function AccountActivityFeed({
  emptyMessage = 'No activity yet',
  hasMore = false,
  icon = 'solar:bolt-bold',
  isLoading = false,
  items = [],
  loadError = null,
  onLoadMore = null,
  showSeeMore = false,
  summaryLabel = null,
  title = 'Recent Activity',
  titleHref = null,
  variant = 'feed',
  showcaseGridClassName = 'grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5',
}) {
  const resolvedSummaryLabel =
    summaryLabel === null ? `${items.length} Events` : summaryLabel

  return (
    <AccountSectionLayout
      icon={icon}
      showSeeMore={showSeeMore}
      summaryLabel={resolvedSummaryLabel}
      title={title}
      titleHref={titleHref}
    >
        {items.length === 0 && isLoading ? (
          <div className="border border-white/5 p-4 text-sm text-white/70">
            Loading activity...
          </div>
        ) : items.length === 0 && !isLoading && !loadError ? (
          <div className="border border-white/5 p-4 text-sm text-white/70">
            {emptyMessage}
          </div>
        ) : items.length === 0 && !isLoading && loadError ? (
          <div className="border border-white/5 p-4 text-sm text-white/70">
            {loadError}
          </div>
        ) : (
          variant === 'showcase' ? (
            <div className={`grid ${showcaseGridClassName}`}>
              {items.map((item, index) => (
                <ShowcaseItem
                  key={`${item.sourceUserId || item.id}-${item.id}-${index}`}
                  item={item}
                />
              ))}
            </div>
          ) : (
            <div>
              {items.map((item, index) => (
                <ActivityItem
                  key={`${item.sourceUserId || item.id}-${item.id}-${index}`}
                  isFirst={item === items[0]}
                  item={item}
                  variant={variant}
                />
              ))}
            </div>
          )
        )}

        {hasMore && typeof onLoadMore === 'function' ? (
          <div className="flex justify-center">
            <Button
              onClick={onLoadMore}
              className="surface-muted px-6 py-3 text-xs font-semibold tracking-widest uppercase transition"
            >
              Load More
            </Button>
          </div>
        ) : null}
    </AccountSectionLayout>
  )
}
