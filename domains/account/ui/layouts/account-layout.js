'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { cn } from '@/shared/utils';
import AccountHero from '../sections/account-hero';
import NavHeightSpacer from '@/ui/layout/nav-height-spacer';
import { PageGradientShell } from '@/ui/layout/page-gradient-shell';
import NotFoundTemplate from '@/ui/feedback/not-found-template';
import { AccountSkeleton } from '@/app/(account)/account/loading';
import { ACCOUNT_ROUTE_SHELL_CLASS } from '@/shared/constants';
import { useNavigationActions } from '@/modules/nav';
import { createAccountBioSurfaceEntry } from '@/domains/account/ui/surfaces/account-bio-surface';
import {
  navBarVariants,
  getNavItemProps,
  pageContainerVariants,
  getSectionRevealProps,
} from '@/app/(account)/motion';

// ─── Reveal Wrappers ──────────────────────────────────────────────────────────

export function AccountHeroReveal({ children, className = '' }) {
  return <div className={className}>{children}</div>;
}

export function AccountNavReveal({ children, className = '' }) {
  return (
    <motion.div
      className={className}
      initial={navBarVariants.initial}
      animate={navBarVariants.animate}
      transition={navBarVariants.transition}
    >
      {children}
    </motion.div>
  );
}

export function AccountSectionReveal({ children, className = '', delay = 0, isInitialSection = false }) {
  const revealProps = getSectionRevealProps(delay, isInitialSection);
  return (
    <motion.div
      className={className}
      initial={revealProps.initial}
      animate={revealProps.animate}
      whileInView={revealProps.whileInView}
      viewport={revealProps.viewport}
      transition={revealProps.transition}
    >
      {children}
    </motion.div>
  );
}

// ─── Nav Items ────────────────────────────────────────────────────────────────

const SECTION_ITEMS = [
  { key: 'overview',  label: 'Overview'  },
  { key: 'activity',  label: 'Activity'  },
  { key: 'likes',     label: 'Likes'     },
  { key: 'watched',   label: 'Watched'   },
  { key: 'watchlist', label: 'Watchlist' },
  { key: 'reviews',   label: 'Reviews'   },
  { key: 'lists',     label: 'Lists'     },
];

const DEFAULT_NOT_FOUND_DESCRIPTION =
  "We couldn't load this account. It may have been removed, or the link may be invalid.";

function getSectionHref(username, key) {
  return key === 'overview' ? `/account/${username}` : `/account/${username}/${key}`;
}

// ─── Section Nav ──────────────────────────────────────────────────────────────

export function AccountSectionNav({ activeKey = 'overview', className = '', username = null }) {
  if (!username) return null;
  return (
    <div className={cn('bg-transparent', className)}>
      <div className={ACCOUNT_ROUTE_SHELL_CLASS}>
        <div className="flex w-full items-stretch gap-2 overflow-x-auto px-3 py-2.5 [scrollbar-width:none] sm:justify-center sm:px-8 sm:py-4 [&::-webkit-scrollbar]:hidden">
          {SECTION_ITEMS.map((item, index) => (
            <NavViewItem
              key={item.key}
              item={item}
              index={index}
              isActive={item.key === activeKey}
              href={getSectionHref(username, item.key)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function NavViewItem({ item, isActive, href, index }) {
  const navItemProps = getNavItemProps(index);
  return (
    <motion.div
      initial={navItemProps.initial}
      animate={navItemProps.animate}
      transition={navItemProps.transition}
      whileHover={navItemProps.whileHover}
      whileTap={navItemProps.whileTap}
    >
      <Link
        href={href}
        className={cn(
          'inline-flex h-8 w-[6.75rem] shrink-0 items-center justify-center rounded-2xl border px-3 text-[10px] font-bold tracking-widest whitespace-nowrap uppercase backdrop-blur-md sm:text-xs',
          isActive
            ? 'border-black bg-black text-white'
            : 'border-black/15 bg-white/40 text-black/70 hover:bg-white/80 hover:text-black',
        )}
      >
        <span>{item.label}</span>
      </Link>
    </motion.div>
  );
}

// ─── Not Found & Page Shell ───────────────────────────────────────────────────

export function AccountNotFoundState({ description = DEFAULT_NOT_FOUND_DESCRIPTION }) {
  return <NotFoundTemplate description={description} />;
}

export function AccountPageShell(props) {
  const { isLoading, resolvedUserId, profile, registry, skeletonVariant = 'overview' } = props;
  if (isLoading) return <AccountSkeleton />;
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
      <ProfileLayout {...props} />
    </>
  );
}

// ─── Profile Layout ───────────────────────────────────────────────────────────

export default function ProfileLayout({
  activeSection = 'overview',
  children,
  followerCount = 0,
  followingCount = 0,
  likesCount = 0,
  listsCount = 0,
  onOpenFollowList = null,
  profile = null,
  username = null,
  watchedCount = null,
  watchlistCount = 0,
}) {
  const { openSurface } = useNavigationActions();
  const profileHandle = username || profile?.username || null;
  const handleReadMore = () => {
    openSurface(
      createAccountBioSurfaceEntry({
        description: profile?.description || '',
        followerCount,
        followingCount,
        profile,
        username: profileHandle || 'About',
      }),
    );
  };
  return (
    <PageGradientShell className="overflow-hidden">
      <motion.div
        className="relative"
        initial={pageContainerVariants.hidden}
        animate={pageContainerVariants.visible}
        exit={pageContainerVariants.exit}
      >
        <AccountNavReveal className="w-full z-20 pt-1 pb-1 sm:pt-2 sm:pb-2">
          <AccountSectionNav activeKey={activeSection} username={profileHandle} />
        </AccountNavReveal>
        <AccountHeroReveal className="mt-24 sm:mt-32 lg:mt-36">
          <AccountHero
            profile={profile}
            likesCount={likesCount}
            followerCount={followerCount}
            followingCount={followingCount}
            listsCount={listsCount}
            onOpenFollowList={onOpenFollowList}
            watchedCount={watchedCount}
            watchlistCount={watchlistCount}
            onReadMore={handleReadMore}
          />
        </AccountHeroReveal>
      </motion.div>
      <main className="pt-4 pb-4 sm:pt-6 sm:pb-6">{children}</main>
      <NavHeightSpacer />
    </PageGradientShell>
  );
}
