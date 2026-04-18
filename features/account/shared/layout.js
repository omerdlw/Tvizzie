'use client';

import { motion, useReducedMotion } from 'framer-motion';
import Link from 'next/link';

import { EASING } from '@/core/constants';
import { cn } from '@/core/utils';
import AccountHero from './hero';
import NavHeightSpacer from '@/features/layout/nav-height-spacer';
import { PageGradientShell } from '@/ui/elements/page-gradient-shell';
import NotFoundTemplate from '@/features/shared/not-found-template';
import AccountRouteSkeleton from '@/ui/skeletons/views/account';
import { ACCOUNT_ROUTE_SHELL_CLASS } from '../utils';

const SECTION_VIEWPORT = {
  amount: 0.08,
  margin: '0px 0px 12% 0px',
  once: true,
};

const REVEAL_TIMING = Object.freeze({
  defaultDuration: 0.66,
  heroDuration: 0.64,
  navDuration: 0.46,
  reducedDuration: 0.16,
  sectionDuration: 0.52,
});
const REVEAL_SYNC = Object.freeze({
  delayScale: 0.9,
  maxDelay: 0.62,
  phaseLead: Object.freeze({
    hero: 0.06,
    nav: 0.04,
    section: 0.1,
  }),
});
const REVEAL_BLUR = 4;

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
  axis = 'y',
  children,
  className = '',
  delay = 0,
  direction = 1,
  distance = 22,
  duration = REVEAL_TIMING.defaultDuration,
  once = true,
  phase = 'section',
}) {
  const reduceMotion = useReducedMotion();
  const motionDistance = direction * distance;
  const initial = reduceMotion
    ? { opacity: 0 }
    : {
        opacity: 0,
        scale: 0.994,
        filter: `blur(${REVEAL_BLUR}px)`,
        ...(axis === 'x' ? { x: motionDistance } : { y: motionDistance }),
      };
  const target = reduceMotion
    ? { opacity: 1 }
    : {
        opacity: 1,
        scale: 1,
        filter: 'blur(0px)',
        ...(axis === 'x' ? { x: 0 } : { y: 0 }),
        transitionEnd: {
          filter: 'none',
          transform: 'none',
          willChange: 'auto',
        },
      };
  const syncedDelay = reduceMotion
    ? 0
    : Math.min(
        REVEAL_SYNC.maxDelay,
        Math.max(0, (REVEAL_SYNC.phaseLead[phase] ?? REVEAL_SYNC.phaseLead.section) + delay * REVEAL_SYNC.delayScale)
      );
  const springConfig =
    phase === 'nav' ? { stiffness: 130, damping: 30, mass: 1 } : { stiffness: 165, damping: 31, mass: 1 };
  const transition = reduceMotion
    ? {
        duration: REVEAL_TIMING.reducedDuration,
        delay: 0,
        ease: EASING.EASE_OUT,
      }
    : {
        opacity: {
          duration: Math.max(0.28, duration * 0.85),
          delay: syncedDelay,
          ease: EASING.EASE_OUT,
        },
        filter: {
          duration: Math.max(0.24, duration * 0.72),
          delay: syncedDelay,
          ease: EASING.EASE_OUT,
        },
        scale: {
          duration: Math.max(0.28, duration * 0.92),
          delay: syncedDelay,
          ease: EASING.SMOOTH,
        },
        x: {
          type: 'spring',
          ...springConfig,
          delay: syncedDelay,
        },
        y: {
          type: 'spring',
          ...springConfig,
          delay: syncedDelay,
        },
      };
  const style = reduceMotion ? undefined : { willChange: 'transform, opacity, filter' };

  if (animateOnView) {
    return (
      <motion.div
        className={className}
        initial={initial}
        whileInView={target}
        viewport={{ ...SECTION_VIEWPORT, once }}
        transition={transition}
        style={style}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <motion.div
      className={className}
      initial={initial}
      animate={target}
      transition={transition}
      style={style}
    >
      {children}
    </motion.div>
  );
}

export function AccountHeroReveal({ children, className = '' }) {
  return (
    <AccountReveal className={className} axis="y" distance={28} duration={REVEAL_TIMING.heroDuration} phase="hero">
      {children}
    </AccountReveal>
  );
}

export function AccountNavReveal({ children, className = '' }) {
  return (
    <AccountReveal className={className} axis="y" distance={18} duration={REVEAL_TIMING.navDuration} phase="nav">
      {children}
    </AccountReveal>
  );
}

export function AccountSectionReveal({ animateOnView = false, children, className = '', delay = 0, once = true }) {
  return (
    <AccountReveal
      className={className}
      animateOnView={animateOnView}
      axis="y"
      distance={24}
      delay={delay}
      duration={REVEAL_TIMING.sectionDuration}
      once={once}
      phase="section"
    >
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
                  duration: reduceMotion ? REVEAL_TIMING.reducedDuration : 0.32,
                  ease: EASING.SMOOTH,
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
                    transition={{
                      duration: reduceMotion ? REVEAL_TIMING.reducedDuration : 0.24,
                      ease: EASING.SMOOTH,
                    }}
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
