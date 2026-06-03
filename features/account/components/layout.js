'use client';

import Link from 'next/link';
import { cn } from '@/core/utils';
import AccountHero from '../profile/hero/index';
import NavHeightSpacer from '@/features/app-shell/nav-height-spacer';
import { PageGradientShell } from '@/ui/elements/page-gradient-shell';
import NotFoundTemplate from '@/features/app-shell/not-found-template';
import AccountRouteSkeleton from '@/ui/skeletons/views/account';
import { ACCOUNT_ROUTE_SHELL_CLASS } from '../utils';
import { useNavigationActions } from '@/core/modules/nav/context';
import AccountBioSurface from '@/features/navigation/surfaces/account-bio-surface';

export function AccountHeroReveal({ children, className = '' }) {
  return <div className={className}>{children}</div>;
}

export function AccountNavReveal({ children, className = '' }) {
  return <div className={className}>{children}</div>;
}

export function AccountSectionReveal({ children, className = '' }) {
  return <div className={className}>{children}</div>;
}

// --------------------------------------------------
// CONSTANTS & HELPERS
// --------------------------------------------------

const SECTION_ITEMS = [{
  key: 'overview',
  label: 'Overview'
}, {
  key: 'activity',
  label: 'Activity'
}, {
  key: 'likes',
  label: 'Likes'
}, {
  key: 'watched',
  label: 'Watched'
}, {
  key: 'watchlist',
  label: 'Watchlist'
}, {
  key: 'reviews',
  label: 'Reviews'
}, {
  key: 'lists',
  label: 'Lists'
}];
const DEFAULT_NOT_FOUND_DESCRIPTION = "We couldn't load this account. It may have been removed, or the link may be invalid.";
function getSectionHref(username, key) {
  return key === 'overview' ? `/account/${username}` : `/account/${username}/${key}`;
}

// --------------------------------------------------
// COMPONENTS (LOGIC & VIEW)
// --------------------------------------------------

export function AccountSectionNav({
  activeKey = 'overview',
  className = '',
  username = null
}) {
  if (!username) return null;
  return <div className={cn('bg-transparent', className)}>
      <div className={ACCOUNT_ROUTE_SHELL_CLASS}>
        <div className="flex w-full items-stretch gap-2 overflow-x-auto px-3 py-2.5 [scrollbar-width:none] sm:justify-center sm:px-8 sm:py-4 [&::-webkit-scrollbar]:hidden">
          {SECTION_ITEMS.map((item, index) => <NavViewItem key={item.key} item={item} index={index} isActive={item.key === activeKey} href={getSectionHref(username, item.key)} />)}
        </div>
      </div>
    </div>;
}
function NavViewItem({
  item,
  isActive,
  href
}) {
  return <div>
      <Link href={href} className={cn('inline-flex h-8 w-[6.75rem] shrink-0 items-center justify-center border px-3 text-[10px] font-bold tracking-widest whitespace-nowrap uppercase backdrop-blur-md sm:text-xs', isActive ? 'border-black bg-black text-white' : 'border-black/15 bg-white/40 text-black/70 hover:bg-white/80 hover:text-black')}>
        <span>
          {item.label}
        </span>
      </Link>
    </div>;
}
export function AccountNotFoundState({
  description = DEFAULT_NOT_FOUND_DESCRIPTION
}) {
  return <NotFoundTemplate description={description} />;
}
export function AccountPageShell(props) {
  const {
    isLoading,
    resolvedUserId,
    profile,
    registry,
    skeletonVariant = 'overview'
  } = props;
  if (isLoading) return <AccountRouteSkeleton variant={skeletonVariant} />;
  if (!resolvedUserId || !profile) {
    return <>
        {registry}
         <AccountNotFoundState />
      </>;
  }
  return <>
      {registry}
      <ProfileLayout {...props} />
    </>;
}
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
  watchlistCount = 0
}) {
  const {
    openSurface
  } = useNavigationActions();
  const profileHandle = username || profile?.username || null;
  const handleReadMore = () => {
    openSurface(AccountBioSurface, {
      description: profile?.description || '',
      followerCount,
      followingCount,
      profile,
      username: profileHandle || 'About'
    });
  };
  return <PageGradientShell className="overflow-hidden">
      <div className="relative">
        <AccountHeroReveal>
          <AccountHero profile={profile} likesCount={likesCount} followerCount={followerCount} followingCount={followingCount} listsCount={listsCount} onOpenFollowList={onOpenFollowList} watchedCount={watchedCount} watchlistCount={watchlistCount} onReadMore={handleReadMore} />
        </AccountHeroReveal>
        <AccountNavReveal className="absolute inset-x-0 top-0 z-20">
          <AccountSectionNav activeKey={activeSection} username={profileHandle} />
        </AccountNavReveal>
      </div>
      <main className="pt-4 pb-4 sm:pt-6 sm:pb-6">{children}</main>
      <NavHeightSpacer />
    </PageGradientShell>;
}
