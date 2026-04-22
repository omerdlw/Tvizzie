'use client';

import { motion, useReducedMotion } from 'framer-motion';
import Link from 'next/link';

import { cn } from '@/core/utils';
import {
  ACCOUNT_NAV_ITEM_STAGGER,
  ACCOUNT_NAV_LABEL_TRANSITION,
  AccountHeroReveal,
  AccountNavReveal,
  AccountSectionReveal,
} from '@/app/(account)/account/motion';
export { AccountHeroReveal, AccountNavReveal, AccountSectionReveal };
import AccountHero from './hero';
import NavHeightSpacer from '@/features/layout/nav-height-spacer';
import { PageGradientShell } from '@/ui/elements/page-gradient-shell';
import NotFoundTemplate from '@/features/shared/not-found-template';
import AccountRouteSkeleton from '@/ui/skeletons/views/account';
import { ACCOUNT_ROUTE_SHELL_CLASS } from '../utils';

const SECTION_ITEMS = [
  { key: 'overview', label: 'Overview' },
  { key: 'activity', label: 'Activity' },
  { key: 'likes', label: 'Likes' },
  { key: 'watched', label: 'Watched' },
  { key: 'watchlist', label: 'Watchlist' },
  { key: 'reviews', label: 'Reviews' },
  { key: 'lists', label: 'Lists' },
];

const DEFAULT_NOT_FOUND_DESCRIPTION =
  "We couldn't load this account. It may have been removed, or the link may be invalid.";

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

export function AccountSectionNav({ activeKey = 'overview', className = '', username = null }) {
  const reduceMotion = useReducedMotion();

  if (!username) {
    return null;
  }

  return (
    <div className={cn('bg-transparent', className)}>
      <div className={ACCOUNT_ROUTE_SHELL_CLASS}>
        <div className="flex w-full items-stretch gap-2 overflow-x-auto px-3 py-2.5 sm:justify-center sm:px-8 sm:py-4">
          {SECTION_ITEMS.map((item, index) => {
            const isActive = item.key === activeKey;

            return (
              <motion.div
                key={item.key}
                initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: reduceMotion ? 0 : index * 0.03,
                  duration: reduceMotion ? 0.16 : ACCOUNT_NAV_ITEM_STAGGER.duration,
                  ease: ACCOUNT_NAV_LABEL_TRANSITION.ease,
                }}
              >
                <Link
                  href={getSectionHref(username, item.key)}
                  className={cn(
                    'inline-flex h-8 shrink-0 items-center rounded-[14px] border px-3.5 text-[10px] font-bold tracking-widest whitespace-nowrap uppercase backdrop-blur-md transition sm:px-4 sm:text-xs',
                    isActive
                      ? 'border-black bg-black text-white'
                      : 'border-black/15 bg-white/40 text-black/70 hover:bg-white/80 hover:text-black'
                  )}
                >
                  <motion.span
                    animate={isActive ? { scale: 1.02 } : { scale: 1 }}
                    transition={reduceMotion ? { duration: 0.16 } : ACCOUNT_NAV_LABEL_TRANSITION}
                  >
                    {item.label}
                  </motion.span>
                </Link>
              </motion.div>
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

export function AccountPageShell({
  activeSection = 'overview',
  children,
  followerCount = 0,
  followingCount = 0,
  isLoading = false,
  likesCount = 0,
  listsCount = 0,
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
  if (isLoading) {
    return <AccountRouteSkeleton variant={skeletonVariant} />;
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
      <ProfileLayout
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
        {children}
      </ProfileLayout>
    </>
  );
}

export default function ProfileLayout({
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
