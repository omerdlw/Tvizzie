'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/core/utils';
import { applyAvatarFallback, getUserAvatarFallbackUrl, getUserAvatarUrl } from '@/core/utils';
import Link from 'next/link';
import { ACCOUNT_ROUTE_SHELL_CLASS } from '../utils';

const DEFAULT_ACCOUNT_HERO_IMAGE =
  'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1600&auto=format&fit=crop';
const ACCOUNT_HERO_HEIGHT_CLASS = 'min-h-[500px] sm:min-h-[620px] lg:min-h-[600px]';
const ACCOUNT_HERO_IMAGE_CLASS =
  'h-full w-full object-cover object-[center_24%] sm:object-[center_28%] lg:object-[center_32%]';
const ACCOUNT_HERO_AMBIENT_OVERLAY_CLASS =
  'absolute inset-0 bg-[linear-gradient(180deg,rgba(8,14,20,0.18)_0%,rgba(8,14,20,0.14)_18%,rgba(8,14,20,0.1)_34%,rgba(4,7,10,0.24)_56%,rgba(250,249,245,0.62)_74%,rgba(250,249,245,0.88)_88%,rgba(250,249,245,0.98)_96%,rgb(250,249,245)_100%)]';
const ACCOUNT_HERO_LEFT_FADE_CLASS =
  'absolute inset-0 bg-[linear-gradient(90deg,rgba(250,249,245,0.97)_0%,rgba(250,249,245,0.94)_12%,rgba(250,249,245,0.82)_24%,rgba(250,249,245,0.6)_36%,rgba(250,249,245,0.34)_50%,rgba(250,249,245,0.12)_62%,rgba(250,249,245,0.03)_70%,rgba(250,249,245,0)_76%)]';
const ACCOUNT_HERO_RIGHT_FADE_CLASS =
  'absolute inset-0 hidden bg-[linear-gradient(270deg,rgba(250,249,245,0.97)_0%,rgba(250,249,245,0.94)_12%,rgba(250,249,245,0.82)_24%,rgba(250,249,245,0.6)_36%,rgba(250,249,245,0.34)_50%,rgba(250,249,245,0.12)_62%,rgba(250,249,245,0.03)_70%,rgba(250,249,245,0)_76%)] lg:block';
const ACCOUNT_HERO_TOP_FADE_CLASS =
  'absolute inset-x-0 top-0 h-32 bg-[linear-gradient(180deg,rgba(250,249,245,0.34)_0%,rgba(250,249,245,0.2)_38%,rgba(250,249,245,0.08)_68%,rgba(250,249,245,0)_100%)] sm:h-36';
const ACCOUNT_HERO_TINT_CLASS =
  'absolute inset-0 bg-[radial-gradient(90%_58%_at_50%_14%,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0.03)_34%,rgba(255,255,255,0)_64%),linear-gradient(180deg,rgba(6,10,16,0.14)_0%,rgba(6,10,16,0.04)_42%,rgba(6,10,16,0)_72%)]';
const ACCOUNT_HERO_CENTER_GLOW_CLASS =
  'absolute left-1/2 top-[16%] h-40 w-40 -translate-x-1/2 rounded-full bg-[#bfdbfe] blur-3xl sm:h-64 sm:w-64';

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
    <div className="mt-2.5 w-full max-w-[560px] sm:mt-3">
      <p ref={textRef} className="line-clamp-3 text-sm leading-6 break-all text-[#0f172a]">
        {description}
      </p>
      {isOverflowing && typeof onReadMore === 'function' ? (
        <button
          type="button"
          onClick={onReadMore}
          className="mt-1 inline text-sm font-medium whitespace-nowrap text-[#0f172a]"
        >
          Read me
        </button>
      ) : null}
    </div>
  );
}

function HeroTextContent({ countsLabel, displayName, mobileStats, onReadMore, profile }) {
  return (
    <div className="w-full max-w-[560px] text-left">
      <div className="flex items-center gap-1">
        <h1 className="min-w-0 text-[2rem] leading-none font-bold tracking-tight sm:text-[2.25rem] lg:text-[3.35rem]">
          {displayName}
        </h1>
      </div>

      <HeroBioPreview description={profile?.description} onReadMore={onReadMore} />

      <div className="mt-4 flex flex-col gap-3 text-sm text-[#0f172a]">
        <div className="grid grid-cols-3 gap-x-5 gap-y-4 pt-1 lg:hidden">
          {mobileStats.map((item, index) => (
            <HeroInlineMetric
              key={`${item.label}-${item.value}-${index}`}
              item={item}
              className="inline-flex min-w-0 items-baseline gap-1.5 text-left whitespace-nowrap"
              valueClassName="text-base font-semibold leading-none tracking-tight text-[#0f172a]"
              labelClassName="truncate text-base leading-none text-[#0f172a]"
            />
          ))}
        </div>

        <div className="hidden flex-wrap items-center gap-x-6 gap-y-2 lg:flex lg:gap-x-7">
          {countsLabel.map((item, index) => (
            <HeroInlineMetric
              key={`${item.label}-${item.value}-${index}`}
              item={item}
              className="inline-flex items-baseline gap-1.5 py-1 whitespace-nowrap"
              valueClassName="text-base font-semibold leading-none tracking-tight text-[#0f172a]"
              labelClassName="text-base leading-none text-[#0f172a]"
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
    createHeroCollectionMetaItem(listsCount, 'List'),
    createHeroCollectionMetaItem(likesCount, 'Like'),
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
    <section
      className={`relative w-full overflow-hidden border-b border-[#0ea5e9] text-[#0f172a] ${ACCOUNT_HERO_HEIGHT_CLASS}`}
    >
      <div className="absolute inset-0">
        <img
          src={profile?.bannerUrl || DEFAULT_ACCOUNT_HERO_IMAGE}
          className={ACCOUNT_HERO_IMAGE_CLASS}
          alt={`${heroDisplayName} cover`}
        />
      </div>
      <div className={ACCOUNT_HERO_TINT_CLASS} />
      <div className={ACCOUNT_HERO_AMBIENT_OVERLAY_CLASS} />
      <div className={ACCOUNT_HERO_LEFT_FADE_CLASS} />
      <div className={ACCOUNT_HERO_RIGHT_FADE_CLASS} />
      <div className={ACCOUNT_HERO_TOP_FADE_CLASS} />
      <div className={ACCOUNT_HERO_CENTER_GLOW_CLASS} />
      <div
        className={`${ACCOUNT_ROUTE_SHELL_CLASS} relative flex ${ACCOUNT_HERO_HEIGHT_CLASS} items-end px-4 pt-20 pb-8 sm:px-8 sm:pt-24 sm:pb-11 lg:pb-12`}
      >
        <div className="grid w-full gap-y-4 sm:gap-y-5 lg:grid-cols-[128px_minmax(0,1fr)_280px] lg:items-end lg:gap-x-8 lg:gap-y-0">
          <div className="h-28 w-28 justify-self-start overflow-hidden sm:h-32 sm:w-32">
            <img
              className="h-full w-full rounded-full object-cover"
              src={heroAvatarSrc}
              alt={heroDisplayName}
              onError={(event) => applyAvatarFallback(event, heroAvatarFallbackSrc)}
            />
          </div>

          <div className="lg:col-start-2 lg:row-start-1 lg:self-end">
            <HeroTextContent
              countsLabel={heroCountItems}
              displayName={heroDisplayName}
              isPrivate={profile?.isPrivate}
              mobileStats={mobileHeroStats}
              onReadMore={onReadMore}
              profile={profile}
            />
          </div>

          <div className="hidden lg:col-start-3 lg:row-start-1 lg:block lg:justify-self-end">
            <HeroStatsGrid
              stats={heroStats}
              className="grid grid-cols-2 gap-6 text-center"
              itemClassName="inline-flex min-w-0 items-baseline gap-1.5 py-1 whitespace-nowrap lg:flex-col lg:items-center lg:gap-0.5 lg:py-0"
              valueClassName="text-base font-semibold leading-none tracking-tight text-[#0f172a] sm:text-lg lg:text-[2.4rem]"
              labelClassName="text-base leading-none text-[#0f172a] lg:mt-1 lg:text-[9px] lg:uppercase lg:tracking-widest"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
