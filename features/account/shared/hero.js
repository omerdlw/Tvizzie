'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/core/utils';
import {
  applyAvatarFallback,
  getUserAvatarFallbackUrl,
  getUserAvatarUrl,
  resolveVersionedImageUrl,
} from '@/core/utils';
import Link from 'next/link';
import AdaptiveImage from '@/ui/elements/adaptive-image';
import { ACCOUNT_ROUTE_SHELL_CLASS } from '../utils';

const ACCOUNT_HERO_HEIGHT_CLASS = cn('account-hero-height');
const ACCOUNT_HERO_IMAGE_CLASS = cn('account-hero-image');
const ACCOUNT_HERO_BANNER_WRAPPER_CLASS = cn('account-hero-banner-wrapper');
const ACCOUNT_HERO_BOTTOM_GRADIENT_CLASS = cn('account-hero-bottom-gradient absolute inset-x-0 bottom-0');
const ACCOUNT_HERO_LEFT_EDGE_GRADIENT_CLASS =
  cn('account-hero-edge-gradient account-hero-left-edge-gradient absolute inset-y-0 left-0');
const ACCOUNT_HERO_RIGHT_EDGE_GRADIENT_CLASS =
  cn('account-hero-edge-gradient account-hero-right-edge-gradient absolute inset-y-0 right-0');

function formatHeroCount(value) {
  return new Intl.NumberFormat('en-US').format(Number(value) || 0);
}

function createHeroCollectionMetaItem(count, singular, plural = `${singular}s`, options = {}) {
  const safeCount = Number(count) || 0;

  return {
    ...options,
    label: safeCount === 1 ? singular : plural,
    value: formatHeroCount(safeCount),
  };
}

function HeroInlineMetric({ item, className = '', labelClassName = '', valueClassName = '' }) {
  const content = (
    <>
      <span className={valueClassName}>{item.value}</span>
      <span className={labelClassName}>{item.label}</span>
    </>
  );
  const wrapperClassName = cn(className, (item.href || typeof item.onClick === 'function') && 'transition-opacity ');

  if (item.href) {
    return (
      <Link href={item.href} className={wrapperClassName}>
        {content}
      </Link>
    );
  }

  if (typeof item.onClick === 'function') {
    return (
      <button
        type="button"
        onClick={item.onClick}
        className={cn('border-0 bg-transparent p-0 text-left', wrapperClassName)}
      >
        {content}
      </button>
    );
  }

  return <span className={wrapperClassName}>{content}</span>;
}

function HeroBioPreview({ description, onReadMore }) {
  const textRef = useRef(null);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const shouldShowReadMore = isOverflowing && typeof onReadMore === 'function';

  useEffect(() => {
    const textElement = textRef.current;

    if (!textElement || !description) {
      setIsOverflowing(false);
      return;
    }

    const updateOverflowState = () => {
      setIsOverflowing(textElement.scrollHeight > textElement.clientHeight + 1);
    };

    updateOverflowState();

    if (document.fonts?.ready) {
      document.fonts.ready.then(updateOverflowState).catch(() => {});
    }

    if (typeof ResizeObserver !== 'function') {
      return;
    }

    const observer = new ResizeObserver(updateOverflowState);
    observer.observe(textElement);

    return () => observer.disconnect();
  }, [description]);

  if (!description) {
    return null;
  }

  return (
    <div className="relative mt-2 w-full">
      <p ref={textRef} className={cn('line-clamp-2 text-sm leading-6 wrap-break-word')}>
        {description}
      </p>
      {shouldShowReadMore ? (
        <div className={cn("account-hero-text-fade absolute right-0 bottom-0 flex h-[24px] items-center justify-end pl-12")}>
          <button className="text-sm font-semibold text-white/70 uppercase" type="button" onClick={onReadMore}>
            More
          </button>
        </div>
      ) : null}
    </div>
  );
}

function HeroTextContent({ countsLabel, displayName, mobileStats }) {
  return (
    <div className="w-full min-w-0 text-left">
      <div className="flex items-center gap-4">
        <h1 className="font-zuume max-w-full min-w-0 text-[2.9rem] leading-none font-bold [overflow-wrap:anywhere] uppercase sm:text-[3.6rem] lg:text-[4.8rem]">
          {displayName}
        </h1>
      </div>

      <div className="mt-2 flex flex-col gap-0.5 text-sm">
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 pt-1 min-[420px]:grid-cols-3 lg:hidden">
          {mobileStats.map((item, index) => (
            <HeroInlineMetric
              key={`${item.label}-${item.value}-${index}`}
              item={item}
              className="inline-flex min-w-0 flex-col items-start gap-0.5 text-left"
              valueClassName="text-base font-semibold leading-none tracking-tight"
              labelClassName="max-w-full truncate text-[13px] leading-none text-white/75"
            />
          ))}
        </div>

        <div className="hidden items-center gap-x-6 gap-y-2 lg:flex lg:gap-x-7">
          {countsLabel.map((item, index) => (
            <HeroInlineMetric
              key={`${item.label}-${item.value}-${index}`}
              item={item}
              className="inline-flex items-baseline gap-1.5 whitespace-nowrap"
              valueClassName="text-base font-semibold leading-none tracking-tight "
              labelClassName="text-base leading-none text-white/75"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function HeroStatsGrid({ stats, className = '', itemClassName = '', labelClassName = '', valueClassName = '' }) {
  return (
    <div className={className}>
      {stats.map((stat, index) =>
        stat.href ? (
          <Link
            key={`${stat.label}-${stat.value}-${index}`}
            href={stat.href}
            className={cn(itemClassName, 'transition-opacity')}
          >
            <div className={valueClassName}>{formatHeroCount(stat.value)}</div>
            <div className={labelClassName}>{stat.label}</div>
          </Link>
        ) : typeof stat.onClick === 'function' ? (
          <button
            key={`${stat.label}-${stat.value}-${index}`}
            type="button"
            onClick={stat.onClick}
            className={cn('border-0 bg-transparent p-0', itemClassName, 'transition-opacity')}
          >
            <div className={valueClassName}>{formatHeroCount(stat.value)}</div>
            <div className={labelClassName}>{stat.label}</div>
          </button>
        ) : (
          <div key={`${stat.label}-${stat.value}-${index}`} className={itemClassName}>
            <div className={valueClassName}>{formatHeroCount(stat.value)}</div>
            <div className={labelClassName}>{stat.label}</div>
          </div>
        )
      )}
    </div>
  );
}

export default function AccountHero({
  likesCount = 0,
  followerCount = 0,
  followingCount = 0,
  listsCount = 0,
  onOpenFollowList = null,
  onReadMore,
  profile = null,
  watchedCount = null,
  watchlistCount = 0,
}) {
  const heroDisplayName = String(profile?.displayName || '').trim() || 'Account';
  const heroBannerSrc =
    resolveVersionedImageUrl(String(profile?.bannerUrl || ''))
      .trim()
      .replace(/^(null|undefined)$/i, '') || null;
  const resolvedWatchedCount =
    watchedCount !== null && watchedCount !== undefined && Number.isFinite(Number(watchedCount))
      ? Number(watchedCount)
      : Number(profile?.watchedCount || 0);
  const heroCountItems = [
    createHeroCollectionMetaItem(watchlistCount, 'Watchlist', 'Watchlist', {
      href: profile?.username ? `/account/${profile.username}/watchlist` : null,
    }),
    createHeroCollectionMetaItem(resolvedWatchedCount, 'Watched', 'Watched', {
      href: profile?.username ? `/account/${profile.username}/watched` : null,
    }),
    createHeroCollectionMetaItem(listsCount, 'List', 'Lists', {
      href: profile?.username ? `/account/${profile.username}/lists` : null,
    }),
    createHeroCollectionMetaItem(likesCount, 'Like', 'Likes', {
      href: profile?.username ? `/account/${profile.username}/likes` : null,
    }),
  ].filter(Boolean);
  const heroStats = [
    {
      label: 'Following',
      onClick: typeof onOpenFollowList === 'function' ? () => onOpenFollowList('following') : null,
      value: followingCount,
    },
    {
      label: 'Followers',
      onClick: typeof onOpenFollowList === 'function' ? () => onOpenFollowList('followers') : null,
      value: followerCount,
    },
  ];
  const mobileHeroStats = [...heroCountItems, ...heroStats].map((item) => ({
    ...item,
    value: formatHeroCount(item.value),
  }));
  const heroAvatarSrc = getUserAvatarUrl(profile);
  const heroAvatarFallbackSrc = getUserAvatarFallbackUrl(profile);

  return (
    <section className={`relative w-full overflow-hidden ${ACCOUNT_HERO_HEIGHT_CLASS}`}>
      {heroBannerSrc ? (
        <div className="absolute inset-0">
          <AdaptiveImage
            mode="img"
            src={heroBannerSrc}
            className={ACCOUNT_HERO_IMAGE_CLASS}
            alt={`${heroDisplayName} cover`}
            loading="eager"
            fetchPriority="high"
            decoding="async"
            wrapperClassName={ACCOUNT_HERO_BANNER_WRAPPER_CLASS}
          />
        </div>
      ) : null}
      <div className={ACCOUNT_HERO_LEFT_EDGE_GRADIENT_CLASS} aria-hidden="true" />
      <div className={ACCOUNT_HERO_RIGHT_EDGE_GRADIENT_CLASS} aria-hidden="true" />
      <div className={ACCOUNT_HERO_BOTTOM_GRADIENT_CLASS} aria-hidden="true" />
      <div
        className={`${ACCOUNT_ROUTE_SHELL_CLASS} relative z-10 flex ${ACCOUNT_HERO_HEIGHT_CLASS} items-end px-4 pt-18 pb-5 sm:px-8 sm:pt-24 sm:pb-7 lg:pb-8`}
      >
        <div className="flex w-full flex-col gap-2 sm:gap-3">
          <div className="grid w-full gap-y-4 lg:grid-cols-[128px_minmax(0,1fr)_280px] lg:grid-rows-[auto_auto] lg:items-end lg:gap-x-8 lg:gap-y-0">
            <div className="h-24 w-24 justify-self-start overflow-hidden rounded sm:h-32 sm:w-32 lg:row-span-2 lg:self-end">
              <AdaptiveImage
                mode="img"
                className="h-full w-full object-cover"
                src={heroAvatarSrc}
                alt={heroDisplayName}
                decoding="async"
                onError={(event) => applyAvatarFallback(event, heroAvatarFallbackSrc)}
                wrapperClassName="h-full w-full"
              />
            </div>

            <div className="lg:col-start-2 lg:row-span-2 lg:self-end">
              <HeroTextContent
                countsLabel={heroCountItems}
                displayName={heroDisplayName}
                mobileStats={mobileHeroStats}
              />
            </div>

            <div className="hidden lg:col-start-3 lg:row-start-2 lg:block lg:self-end lg:justify-self-end">
              <HeroStatsGrid
                stats={heroStats}
                className="grid grid-cols-2 gap-6 text-center"
                itemClassName="inline-flex min-w-0 items-baseline gap-1.5 py-1 whitespace-nowrap lg:flex-col lg:items-center lg:gap-0.5 lg:py-0"
                valueClassName="text-base font-semibold leading-none tracking-tight sm:text-lg lg:text-[2.4rem]"
                labelClassName="text-base leading-none text-white/75 lg:mt-1 lg:text-[9px] lg:uppercase lg:tracking-widest"
              />
            </div>
          </div>
          <div className="w-full lg:pl-[160px]">
            <HeroBioPreview description={profile?.description} onReadMore={onReadMore} />
          </div>
        </div>
      </div>
    </section>
  );
}
