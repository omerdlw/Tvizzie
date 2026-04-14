'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';

import MediaCard from '@/features/shared/media-card';
import { cn } from '@/core/utils';
import ListPreviewComposition from '@/features/shared/list-preview-composition';
import { TMDB_IMG } from '@/core/constants';
import { Button } from '@/ui/elements';
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

function ListPreviewStack({ item, overlay = null }) {
  const previewItems = Array.isArray(item?.activityState?.previewItems)
    ? item.activityState.previewItems.slice(0, 3)
    : [];
  const subjectHref = item?.subject?.href || null;
  const subjectTitle = item?.subject?.title || 'Untitled List';

  return (
    <Link
      href={subjectHref || '#'}
      className="group flex shrink-0 flex-col overflow-hidden rounded-[14px] transition ease-in-out"
    >
      <div className="relative aspect-2/3 w-full overflow-hidden rounded-[14px]">
        <ListPreviewComposition
          className="h-full border-0 bg-transparent"
          imageClassName="h-full w-full object-cover transition-transform duration-(--motion-duration-normal)"
          items={previewItems}
        />
        {overlay}
      </div>

      <span className="sr-only">{subjectTitle}</span>
    </Link>
  );
}



function ShowcaseItem({ item }) {
  const reduceMotion = useReducedMotion();
  const { subjectHref, subjectTitle } = getActivityText(item);
  const posterSrc = resolvePosterSrc(item);
  const showMovieCard = item?.subject?.type !== 'list';
  const createdLabel = formatActivityTime(item?.updatedAt || item?.createdAt);
  const tooltipText = [subjectTitle, createdLabel].filter(Boolean).join(' · ');

  return (
    <motion.div
      className="min-w-0"
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
          imageSizes="(max-width: 767px) 33vw, (max-width: 1023px) 25vw, 16vw"
          fallbackIcon="solar:clapperboard-play-bold"
          tooltipText={tooltipText || subjectTitle}
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

export default function AccountActivityOverview({
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
}) {
  const resolvedSummaryLabel = summaryLabel === null ? `${items.length} Events` : summaryLabel;

  return (
    <AccountSectionLayout
      icon={icon}
      showSeeMore={showSeeMore}
      summaryLabel={resolvedSummaryLabel}
      title={title}
      titleHref={titleHref}
    >
      {items.length === 0 && isLoading ? (
        <div className="border border-black/15 bg-white/40 p-4 text-sm text-black/70 backdrop-blur-sm">
          Loading activity...
        </div>
      ) : items.length === 0 && !isLoading && !loadError ? (
        <div className="border border-black/15 bg-white/40 p-4 text-sm text-black/70 backdrop-blur-sm">
          {emptyMessage}
        </div>
      ) : items.length === 0 && !isLoading && loadError ? (
        <div className="border border-black/15 bg-white/40 p-4 text-sm text-black/70 backdrop-blur-sm">{loadError}</div>
      ) : variant === 'showcase' ? (
        <div className="flex gap-3 overflow-hidden">
          {items.map((item, index) => (
            <div
              key={`${item.sourceUserId || item.id}-${item.id}-${index}`}
              className={cn(
                'flex h-full flex-col shrink-0 basis-[calc((100%-24px)/3)] lg:basis-[calc((100%-60px)/6)]',
                index >= 3 && 'hidden lg:block'
              )}
            >
              <ShowcaseItem item={item} />
            </div>
          ))}
        </div>
      ) : (
        <div>
          {items.map((item, index) => (
            <ActivityItem
              key={`${item.sourceUserId || item.id}-${item.id}-${index}`}
              index={index}
              isFirst={item === items[0]}
              item={item}
              variant={variant}
            />
          ))}
        </div>
      )}

      {hasMore && typeof onLoadMore === 'function' ? (
        <div className="flex justify-center">
          <Button
            onClick={onLoadMore}
            className="border border-black/20 bg-white/65 px-6 py-3 text-xs font-semibold tracking-widest text-black/70 uppercase backdrop-blur-sm transition"
          >
            Load More
          </Button>
        </div>
      ) : null}
    </AccountSectionLayout>
  );
}
