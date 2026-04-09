'use client';

import { motion, useReducedMotion } from 'framer-motion';
import Link from 'next/link';

import { EASING } from '@/core/constants';
import { cn } from '@/core/utils';
import AccountHero from './hero';
import NavHeightSpacer from '@/features/layout/nav-height-spacer';
import { PageGradientShell } from '@/features/layout/page-gradient-backdrop';
import NotFoundTemplate from '@/features/shared/not-found-template';
import AccountRouteSkeleton from '@/ui/skeletons/views/account';
import { ACCOUNT_ROUTE_SHELL_CLASS, ACCOUNT_SECTION_SHELL_CLASS } from '../utils';

const SECTION_VIEWPORT = {
  amount: 0.2,
  margin: '0px 0px -10% 0px',
  once: true,
};

const REVEAL_TIMING = Object.freeze({
  heroDuration: 0.64,
  navDuration: 0.46,
  reducedDuration: 0.16,
  sectionDuration: 0.52,
});

const DEFAULT_NOT_FOUND_DESCRIPTION =
  "We couldn't load this account. It may have been removed, or the link may be invalid.";

const SECTION_ITEMS = [
  { key: 'overview', label: 'Overview' },
  { key: 'activity', label: 'Activity' },
  { key: 'likes', label: 'Likes' },
  { key: 'watched', label: 'Watched' },
  { key: 'watchlist', label: 'Watchlist' },
  { key: 'reviews', label: 'Reviews' },
  { key: 'lists', label: 'Lists' },
];

function AccountReveal({
  animateOnView = false,
  children,
  className = '',
  delay = 0,
  distance = 22,
  duration = REVEAL_TIMING.sectionDuration,
}) {
  const reduceMotion = useReducedMotion();
  const initial = reduceMotion ? { opacity: 0 } : { opacity: 0, y: distance };
  const target = { opacity: 1, y: 0 };
  const transition = {
    delay: reduceMotion ? 0 : delay,
    duration: reduceMotion ? REVEAL_TIMING.reducedDuration : duration,
    ease: EASING.SMOOTH,
  };

  if (animateOnView) {
    return (
      <motion.div
        className={className}
        initial={initial}
        whileInView={target}
        viewport={SECTION_VIEWPORT}
        transition={transition}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <motion.div className={className} initial={initial} animate={target} transition={transition}>
      {children}
    </motion.div>
  );
}

export function AccountHeroReveal({ children, className = '' }) {
  return (
    <AccountReveal className={className} distance={28} duration={REVEAL_TIMING.heroDuration}>
      {children}
    </AccountReveal>
  );
}

export function AccountNavReveal({ children, className = '' }) {
  return (
    <AccountReveal className={className} distance={18} duration={REVEAL_TIMING.navDuration}>
      {children}
    </AccountReveal>
  );
}

export function AccountSectionReveal({ children, className = '', delay = 0 }) {
  return (
    <AccountReveal className={className} distance={24} delay={delay} duration={REVEAL_TIMING.sectionDuration}>
      {children}
    </AccountReveal>
  );
}

function getSectionHref(username, key) {
  const basePath = `/account/${username}`;

  switch (key) {
    case 'overview':
      return basePath;
    case 'likes':
      return `${basePath}/likes`;
    case 'activity':
      return `${basePath}/activity`;
    case 'watched':
      return `${basePath}/watched`;
    case 'watchlist':
      return `${basePath}/watchlist`;
    case 'reviews':
      return `${basePath}/reviews`;
    case 'lists':
      return `${basePath}/lists`;
    default:
      return basePath;
  }
}

function AccountSectionNav({ activeKey = 'overview', className = '', username = null }) {
  if (!username) {
    return null;
  }

  return (
    <div className={cn('bg-transparent', className)}>
      <div className={ACCOUNT_ROUTE_SHELL_CLASS}>
        <div className="flex w-full items-stretch gap-2 overflow-x-auto px-4 py-3 sm:justify-center sm:px-8 sm:py-4">
          {SECTION_ITEMS.map((item) => {
            const isActive = item.key === activeKey;

            return (
              <Link
                key={item.key}
                href={getSectionHref(username, item.key)}
                className={cn(
                  'inline-flex h-8 shrink-0 items-center rounded-[12px] border px-4 text-[11px] font-bold tracking-widest whitespace-nowrap uppercase backdrop-blur-md transition sm:px-4 sm:text-xs',
                  isActive
                    ? 'border-black bg-black text-white'
                    : 'border-black/15 bg-white/40 text-black/70 hover:bg-white/80 hover:text-black'
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function AccountNotFoundState({ description = DEFAULT_NOT_FOUND_DESCRIPTION }) {
  return <NotFoundTemplate description={description} />;
}

function AccountPageLoadingContent() {
  return (
    <section className="relative">
      <div className={`${ACCOUNT_SECTION_SHELL_CLASS} flex flex-col gap-5`}>
        <div className="h-6 w-40 animate-pulse rounded-full bg-black/10" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="aspect-[3/4] animate-pulse bg-black/10" />
          <div className="aspect-[3/4] animate-pulse bg-black/10" />
          <div className="aspect-[3/4] animate-pulse bg-black/10" />
        </div>
      </div>
    </section>
  );
}

export function AccountPageShell({
  activeSection = 'overview',
  children,
  followerCount = 0,
  followingCount = 0,
  isLoading = false,
  likesCount = 0,
  listsCount = 0,
  loadingContent = null,
  onOpenFollowList = null,
  onReadMore,
  profile = null,
  registry = null,
  resolvedUserId = null,
  skeletonVariant = 'overview',
  username = null,
  watchedCount = 0,
  watchlistCount = 0,
}) {
  if (isLoading && (!profile || !resolvedUserId)) {
    return (
      <>
        {registry}
        <AccountRouteSkeleton variant={skeletonVariant} />
      </>
    );
  }

  if (!resolvedUserId || !profile) {
    return (
      <>
        {registry}
        <AccountNotFoundState />
      </>
    );
  }

  return (
    <>
      {registry}
      <AccountProfileLayout
        activeSection={activeSection}
        profile={profile}
        likesCount={likesCount}
        followerCount={followerCount}
        followingCount={followingCount}
        listsCount={listsCount}
        onOpenFollowList={onOpenFollowList}
        username={username}
        watchedCount={watchedCount}
        watchlistCount={watchlistCount}
        onReadMore={onReadMore}
      >
        {isLoading ? loadingContent || <AccountPageLoadingContent /> : children}
      </AccountProfileLayout>
    </>
  );
}

export default function AccountProfileLayout({
  activeSection = 'overview',
  children,
  followerCount = 0,
  followingCount = 0,
  likesCount = 0,
  listsCount = 0,
  onOpenFollowList = null,
  onReadMore,
  profile = null,
  username = null,
  watchedCount = null,
  watchlistCount = 0,
}) {
  const profileHandle = username || profile?.username || null;

  return (
    <PageGradientShell className="overflow-hidden">
      <div className="relative">
        <AccountHeroReveal>
          <AccountHero
            profile={profile}
            likesCount={likesCount}
            followerCount={followerCount}
            followingCount={followingCount}
            listsCount={listsCount}
            onOpenFollowList={onOpenFollowList}
            watchedCount={watchedCount}
            watchlistCount={watchlistCount}
            onReadMore={onReadMore}
          />
        </AccountHeroReveal>
        <AccountNavReveal className="absolute inset-x-0 top-0 z-20">
          <AccountSectionNav activeKey={activeSection} username={profileHandle} />
        </AccountNavReveal>
      </div>
      <main>{children}</main>
      <NavHeightSpacer />
    </PageGradientShell>
  );
}
