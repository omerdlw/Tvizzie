'use client';

import Link from 'next/link';

import { cn } from '@/core/utils';
export function AccountHeroReveal({ children, className }) {
  return <div className={className}>{children}</div>;
}

export function AccountNavReveal({ children, className }) {
  return <div className={className}>{children}</div>;
}

export function AccountSectionReveal({ children, className }) {
  return <div className={className}>{children}</div>;
}
import AccountHero from './hero';
import { AccountGridDivider, AccountGridFrame } from './grid-animation';
import NavHeightSpacer from '@/features/app-shell/nav-height-spacer';
import NotFoundTemplate from '@/features/app-shell/not-found-template';
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
  if (!username) {
    return null;
  }

  return (
    <div className={cn('bg-transparent', className)}>
      <div className={ACCOUNT_ROUTE_SHELL_CLASS}>
        <div className="flex w-full items-stretch gap-2 overflow-x-auto px-3 py-2.5 sm:justify-center sm:px-8 sm:py-4">
          {SECTION_ITEMS.map((item) => {
            const isActive = item.key === activeKey;

            return (
              <div
                key={item.key}
              >
                <Link
                  href={getSectionHref(username, item.key)}
                  className={cn(
                    'inline-flex h-8 w-[6.75rem] shrink-0 items-center justify-center rounded-xs border px-3 text-[10px] font-bold tracking-widest whitespace-nowrap uppercase backdrop-blur-md transition sm:text-xs',
                    isActive
                      ? 'border-white bg-white text-black'
                      : 'border-white/15 bg-black/40 text-white/70 hover:bg-black/80 hover:text-white'
                  )}
                >
                  <span>
                    {item.label}
                  </span>
                </Link>
              </div>
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
    <div className="account-detail-grid-content relative min-h-dvh w-full overflow-hidden bg-black">
      <AccountGridFrame
        routeKey={profileHandle ? `account-${profileHandle}` : 'account-current'}
        className={cn('flex flex-col gap-0 px-0', ACCOUNT_ROUTE_SHELL_CLASS)}
      >
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
        <div className="account-detail-hero-divider">
          <AccountGridDivider />
        </div>
        <main className="account-detail-grid-main">{children}</main>
        <NavHeightSpacer />
      </AccountGridFrame>
    </div>
  );
}
