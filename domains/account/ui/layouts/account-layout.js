'use client';

import { GridShellCrosshairs } from '@/domains/shell/layout/grid-crosshair';
import { createContext, useContext, useEffect, useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSelectedLayoutSegment } from 'next/navigation';
import { cn } from '@/domains/shell/shared/utils';
import AccountHero from '../sections/account-hero';
import NavHeightSpacer from '@/domains/shell/layout/nav-height-spacer';
import { PageGradientShell } from '@/domains/shell/layout/page-gradient-shell';
import NotFoundTemplate from '@/domains/shell/layout/not-found-template';
import { AccountSkeleton, renderAccountSectionSkeleton } from '@/app/(account)/account/loading';
import AccountBackgroundRegistry from './account-background-registry';
import { ACCOUNT_ROUTE_SHELL_CLASS } from '@/domains/shell/shared/constants';
import { useNavigationActions } from '@/modules/nav';
import { useRegistry } from '@/modules/registry';
import {
  getUserAvatarUrl,
} from '@/domains/account/utils/avatar';
import { createAccountBioSurfaceEntry } from '@/domains/shell/navigation/surfaces/account-bio-surface';
import { AccountProfileShellProvider, useAccountProfileShell } from './account-profile-context';
import AccountGridFrame from './account-grid-frame';
// ─── Nav Transition Context ───────────────────────────────────────────────────

const AccountNavTransitionContext = createContext({
  pendingTab: null,
  startTabTransition: () => {},
});

export function AccountNavTransitionProvider({ children }) {
  const [pendingTab, setPendingTab] = useState(null);
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();

  useEffect(() => {
    setPendingTab(null);
  }, [pathname]);

  const startTabTransition = (tabKey, href) => {
    setPendingTab(tabKey);
    startTransition(() => {
      router.push(href);
    });
  };

  return (
    <AccountNavTransitionContext.Provider value={{ pendingTab, startTabTransition }}>
      {children}
    </AccountNavTransitionContext.Provider>
  );
}

export function useAccountNavTransition() {
  return useContext(AccountNavTransitionContext);
}

// ─── Reveal Wrappers ──────────────────────────────────────────────────────────

export function AccountHeroReveal({ children, className = '' }) {
  return <div className={className}>{children}</div>;
}

export function AccountNavReveal({ children, className = '' }) {
  return <div className={className}>{children}</div>;
}

// ─── Nav Items ────────────────────────────────────────────────────────────────

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
  return key === 'overview' ? `/account/${username}` : `/account/${username}/${key}`;
}

const SECTION_KEYS_SET = new Set([
  'overview',
  'activity',
  'likes',
  'watched',
  'watchlist',
  'reviews',
  'lists',
]);

function resolveAccountPageDescription(pathname = '') {
  const segments = String(pathname || '')
    .split('/')
    .filter(Boolean);
  const section = segments[2];

  if (segments[1] === 'edit') return 'Edit Account';
  if (!section) return 'Profile Overview';

  return (
    {
      activity: 'Activity Feed',
      likes: 'Likes',
      watched: 'Watched',
      watchlist: 'Watchlist',
      reviews: 'Reviews',
      lists: 'Lists',
    }[section] || 'Profile Overview'
  );
}

function AccountProfileShellNav({ profile }) {
  const pathname = usePathname();
  const accountTitle = String(profile?.displayName || profile?.username || 'Account').trim();

  useRegistry({
    nav: {
      path: '/account',
      title: accountTitle,
      icon: getUserAvatarUrl(profile),
      description: resolveAccountPageDescription(pathname),
      registry: {
        priority: 180,
        source: 'account-profile-shell',
      },
    },
  });

  return null;
}

// ─── Section Nav ──────────────────────────────────────────────────────────────

export function AccountSectionNav({ activeKey = 'overview', className = '', username = null }) {
  if (!username) return null;
  return (
    <div className={cn('relative w-full bg-transparent', className)}>
      <div className="pointer-events-none absolute bottom-0 left-1/2 h-px w-screen -translate-x-1/2 bg-white/10 backdrop-blur-sm">
        <GridShellCrosshairs />
      </div>
      <div className={ACCOUNT_ROUTE_SHELL_CLASS}>
        <div className="grid h-14 w-full auto-cols-[6.75rem] grid-flow-col divide-x divide-white/10 overflow-x-auto [scrollbar-width:none] sm:auto-cols-auto sm:grid-flow-row sm:grid-cols-7 [&::-webkit-scrollbar]:hidden">
          {SECTION_ITEMS.map((item, index) => (
            <div key={index} className="h-14 p-2 sm:min-w-0">
              <NavViewItem
                key={item.key}
                item={item}
                index={index}
                isActive={item.key === activeKey}
                href={getSectionHref(username, item.key)}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function AccountSectionNavWrapper({
  activeSection = null,
  className = '',
  username = null,
}) {
  const segment = useSelectedLayoutSegment();
  const { pendingTab } = useAccountNavTransition();
  const resolvedActiveKey =
    pendingTab ||
    (segment && SECTION_KEYS_SET.has(segment) ? segment : activeSection || 'overview');
  return (
    <AccountSectionNav activeKey={resolvedActiveKey} className={className} username={username} />
  );
}

function NavViewItem({ item, isActive, href, index }) {
  const { startTabTransition } = useAccountNavTransition();

  const handleClick = (e) => {
    if (
      !e.defaultPrevented &&
      e.button === 0 &&
      !e.metaKey &&
      !e.ctrlKey &&
      !e.shiftKey &&
      !e.altKey
    ) {
      e.preventDefault();
      startTabTransition(item.key, href);
    }
  };

  return (
    <Link
      href={href}
      onClick={handleClick}
      className={cn(
        'center relative h-full w-full shrink-0 px-2 text-[10px] tracking-wide whitespace-nowrap uppercase transition-all duration-300 ease-in-out last:border-none hover:scale-[1.015] active:scale-[0.985] sm:text-xs',
        isActive
          ? 'font-bold text-black'
          : 'font-semibold text-white/70 hover:bg-white/10 hover:text-white hover:backdrop-blur-md',
      )}
    >
      {isActive ? <span className="absolute inset-0 bg-white" /> : null}
      <span className="relative z-10">{item.label}</span>
    </Link>
  );
}

// ─── Not Found & Page Shell ───────────────────────────────────────────────────

export function AccountNotFoundState({ description = DEFAULT_NOT_FOUND_DESCRIPTION }) {
  return <NotFoundTemplate description={description} />;
}

export function AccountPageShell(props) {
  const { isLoading, resolvedUserId, profile, registry, skeletonVariant = 'overview' } = props;
  const profileShell = useAccountProfileShell();

  if (profileShell) {
    return (
      <>
        {registry}
        {isLoading ? renderAccountSectionSkeleton(skeletonVariant) : props.children}
      </>
    );
  }

  if (isLoading) {
    const skeletonActiveTab = skeletonVariant === 'list-detail' ? 'lists' : skeletonVariant;
    return <AccountSkeleton activeTab={skeletonActiveTab} />;
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
      <ProfileLayout {...props} />
    </>
  );
}

// ─── Profile Layout ───────────────────────────────────────────────────────────

export default function ProfileLayout(props) {
  return (
    <AccountNavTransitionProvider>
      <ProfileLayoutInner {...props} />
    </AccountNavTransitionProvider>
  );
}

function AccountSectionScene({ children }) {
  return <div className="w-full">{children}</div>;
}

function ProfileLayoutInner({
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
  const { pendingTab } = useAccountNavTransition();
  const { openSurface } = useNavigationActions();
  const pathname = usePathname();
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

  const mainContent = pendingTab ? renderAccountSectionSkeleton(pendingTab) : children;
  const profileShell = useMemo(
    () => ({
      followerCount,
      followingCount,
      likesCount,
      listsCount,
      profile,
      username: profileHandle,
      watchedCount,
      watchlistCount,
    }),
    [
      followerCount,
      followingCount,
      likesCount,
      listsCount,
      profile,
      profileHandle,
      watchedCount,
      watchlistCount,
    ],
  );

  return (
    <AccountProfileShellProvider value={profileShell}>
      <AccountProfileShellNav profile={profile} />
      <AccountBackgroundRegistry bannerUrl={profile?.bannerUrl} />
      <PageGradientShell className="overflow-hidden">
        <AccountGridFrame />
        <div
          className={`relative z-10 mx-auto flex w-full ${ACCOUNT_ROUTE_SHELL_CLASS} flex-col gap-6 pb-12 sm:gap-8`}
        >
          <AccountNavReveal className="absolute inset-x-0 top-0 z-20">
            <AccountSectionNavWrapper activeSection={activeSection} username={profileHandle} />
          </AccountNavReveal>
          <div className="mt-28 flex w-full flex-col items-center gap-8 sm:mt-36 sm:gap-12 lg:mt-44 lg:gap-16">
            <AccountHeroReveal className="w-full">
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

            <main className="w-full pt-4 pb-6 text-left sm:pt-6 sm:pb-8">
              <AccountSectionScene sceneKey={pendingTab ? `skeleton-${pendingTab}` : pathname}>
                {mainContent}
              </AccountSectionScene>
            </main>
          </div>
        </div>
        <NavHeightSpacer />
      </PageGradientShell>
    </AccountProfileShellProvider>
  );
}
