'use client';

import { createContext, useContext, useEffect, useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSelectedLayoutSegment } from 'next/navigation';
import AccountHero from '../sections/account-hero';
import { NavHeightSpacer } from '@/modules/nav';
import NotFoundTemplate from '@/domains/shell/not-found-template';
import { AccountSkeleton, renderAccountSectionSkeleton } from '@/domains/account/ui/skeletons';
import { useNavigationActions } from '@/modules/nav';
import { useRegistry } from '@/modules/registry';
import { useAuth } from '@/modules/auth';
import { getUserAvatarUrl } from '@/domains/account/utils/avatar';
import { createAccountBioSurfaceEntry } from '@/domains/shell/navigation/surfaces/account-bio-surface';
import { PAGE_SHELL_MAX_WIDTH_CLASS } from '@/shared';
import Icon from '@/ui/primitives/icon';
import { cn } from '@/ui/class-names';
import { AccountProfileShellProvider, useAccountProfileShell } from './account-profile-context';

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

export function AccountHeroReveal({ children, className = '' }) {
  return <div className={className}>{children}</div>;
}

export function AccountNavReveal({ children, className = '' }) {
  return <div className={className}>{children}</div>;
}

const SECTION_ITEMS = [
  { key: 'overview', label: 'Overview', icon: 'solar:widget-bold' },
  { key: 'activity', label: 'Activity', icon: 'solar:bolt-bold' },
  { key: 'diary', label: 'Diary', icon: 'solar:calendar-mark-bold' },
  { key: 'likes', label: 'Likes', icon: 'solar:heart-bold' },
  { key: 'watched', label: 'Watched', icon: 'solar:eye-bold' },
  { key: 'watchlist', label: 'Watchlist', icon: 'solar:bookmark-bold' },
  { key: 'reviews', label: 'Reviews', icon: 'solar:chat-round-bold' },
  { key: 'lists', label: 'Lists', icon: 'solar:list-bold' },
];

const DEFAULT_NOT_FOUND_DESCRIPTION =
  "We couldn't load this account. It may have been removed, or the link may be invalid.";

function getSectionHref(username, key) {
  return key === 'overview' ? `/account/${username}` : `/account/${username}/${key}`;
}

const SECTION_KEYS_SET = new Set([
  'overview',
  'activity',
  'diary',
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
      diary: 'Watch Diary',
      likes: 'Likes',
      watched: 'Watched',
      watchlist: 'Watchlist',
      reviews: 'Reviews',
      lists: 'Lists',
    }[section] || 'Profile Overview'
  );
}

function AccountProfileShellNav({ profile, username }) {
  const auth = useAuth();
  const pathname = usePathname();
  const [isSearching, setIsSearching] = useState(false);
  const accountTitle = String(profile?.displayName || profile?.username || 'Account').trim();
  const isOwner = Boolean(
    (auth.user?.id && profile?.id && auth.user.id === profile.id) ||
    (auth.user?.username && profile?.username && auth.user.username === profile.username) ||
    !username,
  );
  const targetPath =
    !isOwner && (username || profile?.username)
      ? `/account/${username || profile?.username}`
      : '/account';

  useRegistry({
    nav: {
      path: targetPath,
      title: accountTitle,
      icon: getUserAvatarUrl(profile),
      iconOverlay: profile?.isPrivate
        ? { icon: 'solar:lock-keyhole-bold', title: 'Private profile' }
        : null,
      description: resolveAccountPageDescription(pathname),
      actions: [
        ...(isOwner
          ? [
              {
                key: 'edit-profile',
                icon: 'solar:pen-bold',
                tooltip: 'Edit Profile',
                order: 25,
                onClick: (event) => {
                  event.stopPropagation();
                  window.location.assign('/account/edit');
                },
              },
            ]
          : []),
        {
          key: 'search-overlay',
          tooltip: 'Search',
          icon: isSearching ? 'material-symbols:close-rounded' : 'solar:magnifer-linear',
          order: 30,
          onClick: (event) => {
            event.stopPropagation();
            setIsSearching((value) => !value);
          },
        },
      ],
      registry: {
        priority: 180,
        source: 'account-profile-shell',
      },
    },
  });

  return null;
}

export function AccountSectionNav({ activeKey = 'overview', className = '', username = null }) {
  if (!username) return null;

  return (
    <div
      className={cn(
        'relative mx-auto flex w-full max-w-full items-center overflow-hidden border-b border-white/5',
        className,
      )}
    >
      <nav
        aria-label="Account sections"
        className="flex w-full max-w-full scrollbar-none items-center overflow-x-auto"
      >
        {SECTION_ITEMS.map((item) => {
          return (
            <NavViewItem
              key={item.key}
              item={item}
              isActive={item.key === activeKey}
              href={getSectionHref(username, item.key)}
            />
          );
        })}
      </nav>
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
    <AccountSectionNav activeKey={resolvedActiveKey} username={username} className={className} />
  );
}

function NavViewItem({ item, isActive, href }) {
  const transition = useAccountNavTransition();
  const router = useRouter();

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
      if (typeof transition?.startTabTransition === 'function') {
        transition.startTabTransition(item.key, href);
      } else {
        router.push(href);
      }
    }
  };

  return (
    <Link
      href={href}
      onClick={handleClick}
      className={cn(
        'inline-flex h-12 shrink-0 items-center justify-center gap-1.5 border-b-2 px-3 text-xs font-semibold uppercase transition-colors select-none sm:min-w-0 sm:flex-1 sm:px-2',
        isActive
          ? 'border-white text-white'
          : 'border-transparent text-white/70 hover:bg-white/10 hover:text-white',
      )}
    >
      {item.icon ? (
        <Icon icon={item.icon} size={14} className={isActive ? 'text-white' : 'text-white/40'} />
      ) : null}
      <span>
        {item.label}
      </span>
    </Link>
  );
}

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
  reviewsCount = 0,
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
      reviewsCount,
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
      reviewsCount,
      profileHandle,
      watchedCount,
      watchlistCount,
    ],
  );

  return (
    <AccountProfileShellProvider value={profileShell}>
      <AccountProfileShellNav profile={profile} username={profileHandle} />

        <div
          className={`relative z-10 mx-auto flex w-full ${PAGE_SHELL_MAX_WIDTH_CLASS} flex-col px-4 pb-16 [overflow-anchor:none] sm:px-6 lg:px-8`}
        >
          <AccountHeroReveal>
            <AccountHero
              profile={profile}
              followerCount={followerCount}
              followingCount={followingCount}
              onOpenFollowList={onOpenFollowList}
              onReadMore={handleReadMore}
            />
          </AccountHeroReveal>

          <AccountNavReveal className="mt-8 sm:mt-10">
            <AccountSectionNavWrapper activeSection={activeSection} username={profileHandle} />
          </AccountNavReveal>

          <main className="w-full pt-6 sm:pt-8">
            <AccountSectionScene sceneKey={pendingTab ? '' : pathname}>
              {mainContent}
            </AccountSectionScene>
          </main>
        </div>
        <NavHeightSpacer className="w-full bg-black" />

    </AccountProfileShellProvider>
  );
}
