'use client';

import { useCallback, useMemo } from 'react';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';

import {
  collectActivitySubjectOptions,
  hasActiveActivityFilters,
} from '@/features/account/filtering';
import { AccountActivityFilterBar } from '@/features/account/shared/content-filters';
import MediaCard from '@/features/shared/media-card';
import ListPreviewComposition from '@/features/shared/list-preview-composition';
import AccountPagination from '@/features/account/shared/pagination';
import { formatPaginationSummaryLabel } from '@/features/account/utils';
import { TMDB_IMG } from '@/core/constants';
import AccountSectionLayout from '../shared/section-wrapper';

const EVENT_META = Object.freeze({
  FOLLOW_ACCEPTED: {
    action: 'accepted',
    icon: 'solar:users-group-rounded-bold',
  },
  FOLLOW_CREATED: {
    action: 'followed',
    icon: 'solar:user-plus-bold',
  },
  LIST_ITEM_ADDED: {
    action: 'added items to',
    icon: 'solar:playlist-minimalistic-bold',
  },
  LIST_CREATED: {
    action: 'created',
    icon: 'solar:list-broken',
  },
  LIST_LIKED: {
    action: 'liked',
    icon: 'solar:heart-bold',
  },
  MEDIA_LIKED: {
    action: 'liked',
    icon: 'solar:heart-angle-bold',
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
});
const ACTIVITY_ITEMS_PER_PAGE = 36;

function formatActivityTime(value) {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.max(0, Math.floor(diffMs / (60 * 1000)));

  if (diffMinutes < 1) {
    return 'now';
  }

  if (diffMinutes < 60) {
    return `${diffMinutes}m`;
  }

  const diffHours = Math.floor(diffMinutes / 60);

  if (diffHours < 24) {
    return `${diffHours}h`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d`;
}

function getActivityText(item) {
  const actorName = item?.actor?.displayName || item?.actor?.username || 'Someone';
  const meta = EVENT_META[item?.eventType] || { action: 'updated' };
  const followStatus = String(item?.payload?.status || '')
    .trim()
    .toLowerCase();
  const action =
    item?.eventType === 'REVIEW_PUBLISHED' && item?.payload?.reviewMode === 'rating'
      ? 'rated'
      : item?.eventType === 'FOLLOW_CREATED' && followStatus === 'pending'
        ? 'requested to follow'
        : meta.action;
  const subjectTitle = item?.subject?.title || 'something';

  return {
    actorName,
    action,
    subjectHref: item?.subject?.href || null,
    subjectTitle,
  };
}

function resolvePosterSrc(item) {
  const poster = String(item?.subject?.poster || '').trim();

  if (!poster) {
    return null;
  }

  if (poster.startsWith('http://') || poster.startsWith('https://')) {
    return poster;
  }

  if (poster.startsWith('/')) {
    return `${TMDB_IMG}/w342${poster}`;
  }

  return poster;
}

function ListPreviewStack({ item }) {
  const previewItems = Array.isArray(item?.activityState?.previewItems)
    ? item.activityState.previewItems.slice(0, 3)
    : [];
  const subjectHref = item?.subject?.href || null;
  const subjectTitle = item?.subject?.title || 'Untitled List';

  return (
    <Link
      href={subjectHref || '#'}
      className="group block aspect-2/3 w-full overflow-hidden rounded-[12px] border border-black/15"
    >
      <ListPreviewComposition
        className="border-0 bg-transparent"
        imageClassName="h-full w-full object-cover transition-transform duration-(--motion-duration-normal) "
        items={previewItems}
      />

      <span className="sr-only">{subjectTitle}</span>
    </Link>
  );
}

function ShowcaseItem({ item }) {
  const reduceMotion = useReducedMotion();
  const { subjectHref, subjectTitle } = getActivityText(item);
  const posterSrc = resolvePosterSrc(item);
  const showMovieCard = item?.subject?.type !== 'list';

  return (
    <motion.div
      className="flex min-w-0 flex-col h-full"
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 14, scale: 0.988 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, amount: 0, margin: '0px 0px 14% 0px' }}
      transition={{
        duration: reduceMotion ? 0.16 : 0.32,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      {showMovieCard ? (
        <MediaCard
          href={subjectHref}
          className="w-full"
          imageSrc={posterSrc}
          imageAlt={subjectTitle}
          imageSizes="(max-width: 767px) 50vw, (max-width: 1023px) 33vw, 25vw"
          fallbackIcon="solar:clapperboard-play-bold"
          tooltipText={subjectTitle}
        />
      ) : (
        <ListPreviewStack item={item} />
      )}
    </motion.div>
  );
}

function ActivityItem({ index = 0, isFirst = false, item, variant = 'feed' }) {
  const reduceMotion = useReducedMotion();
  const { actorName, action, subjectHref, subjectTitle } = getActivityText(item);
  const createdLabel = formatActivityTime(item?.updatedAt || item?.createdAt);
  const isShowcase = variant === 'showcase';

  return (
    <motion.article
      className={
        isShowcase
          ? `border-b border-black/10 ${isFirst ? 'pt-0 pb-4' : 'py-4'} last:border-b-0`
          : `border-b border-black/10 ${isFirst ? 'pt-0 pb-5' : 'py-5'} last:border-b-0`
      }
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0, margin: '0px 0px 14% 0px' }}
      transition={{
        delay: reduceMotion ? 0 : index < 6 ? index * 0.016 : 0,
        duration: reduceMotion ? 0.16 : 0.32,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
        <div className="min-w-0 text-[1.02rem] leading-7">
          <span className="font-semibold">{actorName}</span> <span className="">{action}</span>{' '}
          {subjectHref ? (
            <Link href={subjectHref} className="transition">
              {subjectTitle}
            </Link>
          ) : (
            <span>{subjectTitle}</span>
          )}
        </div>

        {createdLabel ? <div className="shrink-0 text-sm font-medium sm:pt-0.5">{createdLabel}</div> : null}
      </div>
    </motion.article>
  );
}

export default function AccountActivityFeed({
  currentPage = 1,
  emptyMessage = 'No activity yet',
  filters = { sort: 'newest', subject: 'all' },
  icon = 'solar:bolt-bold',
  isLoading = false,
  items = [],
  loadError = null,
  onFiltersChange = null,
  onPageChange = null,
  showHeader = true,
  showSeeMore = false,
  summaryLabel = null,
  title = 'Recent Activity',
  titleHref = null,
  totalCount = 0,
  variant = 'feed',
  showcaseGridClassName = 'grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6',
}) {
  const listedActivityCount = Number.isFinite(Number(totalCount)) ? Math.max(0, Math.floor(Number(totalCount))) : 0;
  const subjectOptions = useMemo(() => collectActivitySubjectOptions(), []);
  const hasFilters = hasActiveActivityFilters(filters);
  const totalPages = listedActivityCount > 0 ? Math.ceil(listedActivityCount / ACTIVITY_ITEMS_PER_PAGE) : 1;
  const activePage = Math.min(Math.max(1, currentPage), totalPages);
  const pageStart = (activePage - 1) * ACTIVITY_ITEMS_PER_PAGE;
  const visibleItems = Array.isArray(items) ? items : [];
  const resolvedSummaryLabel = useMemo(() => {
    if (!hasFilters) {
      return summaryLabel === null ? `${listedActivityCount} Events` : summaryLabel;
    }

    const shownCount = Math.min(listedActivityCount, pageStart + visibleItems.length);
    return `${shownCount} of ${listedActivityCount} shown`;
  }, [hasFilters, listedActivityCount, pageStart, summaryLabel, visibleItems.length]);

  const updateFilters = useCallback(
    (updates = {}) => {
      onFiltersChange?.({
        ...filters,
        ...updates,
      });
    },
    [filters, onFiltersChange]
  );

  const resetFilters = useCallback(() => {
    onFiltersChange?.({
      sort: 'newest',
      subject: 'all',
    });
  }, [onFiltersChange]);

  return (
    <AccountSectionLayout
      icon={icon}
      showHeader={showHeader}
      showSeeMore={showSeeMore}
      summaryLabel={resolvedSummaryLabel}
      title={title}
      titleHref={titleHref}
    >
      {listedActivityCount > 0 ? (
        <AccountActivityFilterBar
          filters={filters}
          subjectOptions={subjectOptions}
          onChange={updateFilters}
          onReset={hasFilters ? resetFilters : null}
        />
      ) : null}

      {visibleItems.length === 0 && isLoading ? (
        <div className="border border-black/15 bg-white/40 p-4 text-sm text-black/70 backdrop-blur-sm">
          Loading activity...
        </div>
      ) : listedActivityCount === 0 && !isLoading && !loadError ? (
        <div className="border border-black/15 bg-white/40 p-4 text-sm text-black/70 backdrop-blur-sm">
          {emptyMessage}
        </div>
      ) : listedActivityCount === 0 && !isLoading && loadError ? (
        <div className="border border-black/15 bg-white/40 p-4 text-sm text-black/70 backdrop-blur-sm">{loadError}</div>
      ) : variant === 'showcase' ? (
        <div className={`grid ${showcaseGridClassName}`}>
          {visibleItems.map((item, index) => (
            <ShowcaseItem key={`${item.sourceUserId || item.id}-${item.id}-${index}`} item={item} />
          ))}
        </div>
      ) : (
        <div>
          {visibleItems.map((item, index) => (
            <ActivityItem
              key={`${item.sourceUserId || item.id}-${item.id}-${index}`}
              index={index}
              isFirst={item === visibleItems[0]}
              item={item}
              variant={variant}
            />
          ))}
        </div>
      )}

      {listedActivityCount > 0 ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs font-semibold tracking-widest text-black/60 uppercase">
            {formatPaginationSummaryLabel({
              emptyLabel: '0 total',
              pageSize: ACTIVITY_ITEMS_PER_PAGE,
              startIndex: pageStart,
              totalCount: listedActivityCount,
            })}
          </p>

          <AccountPagination
            currentPage={activePage}
            onPageChange={onPageChange}
            totalPages={totalPages}
            className="flex flex-wrap items-center justify-end gap-2"
          />
        </div>
      ) : null}
    </AccountSectionLayout>
  );
}
