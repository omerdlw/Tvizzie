'use client';

import { usePathname } from 'next/navigation';
import { AccountSkeletonLayout } from '@/domains/account/ui/skeletons/account-skeleton-layout';
import {
  AccountActivitySkeleton,
  AccountEditSkeleton,
  AccountListsSkeleton,
  AccountMediaGridSkeleton,
  AccountOverviewSkeleton,
  AccountReviewsSkeleton,
} from '@/domains/account/ui/skeletons/account-section-skeletons';

export function resolveAccountTabFromPathname(pathname) {
  if (!pathname) return { activeTab: 'overview', variant: 'overview' };

  const segments = pathname.split('/').filter(Boolean);
  if (segments[0] !== 'account') {
    return { activeTab: 'overview', variant: 'overview' };
  }

  if (segments[1] === 'edit') {
    return { activeTab: 'overview', variant: 'edit' };
  }

  if (segments.length <= 2) {
    return { activeTab: 'overview', variant: 'overview' };
  }

  const subtab = segments[2];
  switch (subtab) {
    case 'activity':
      return { activeTab: 'activity', variant: 'activity' };
    case 'likes':
      return { activeTab: 'likes', variant: 'likes' };
    case 'watched':
      return { activeTab: 'watched', variant: 'watched' };
    case 'watchlist':
      return { activeTab: 'watchlist', variant: 'watchlist' };
    case 'reviews':
      return { activeTab: 'reviews', variant: 'reviews' };
    case 'lists':
      return { activeTab: 'lists', variant: 'lists' };
    default:
      return { activeTab: 'overview', variant: 'overview' };
  }
}

export function renderAccountSectionSkeleton(tabOrVariant) {
  switch (tabOrVariant) {
    case 'activity':
      return <AccountActivitySkeleton />;
    case 'likes':
    case 'watched':
    case 'watchlist':
      return <AccountMediaGridSkeleton />;
    case 'reviews':
      return <AccountReviewsSkeleton />;
    case 'lists':
      return <AccountListsSkeleton />;
    case 'edit':
      return <AccountEditSkeleton />;
    case 'overview':
    default:
      return <AccountOverviewSkeleton />;
  }
}

export function AccountSkeleton({ activeTab: explicitActiveTab, children }) {
  const pathname = usePathname();
  const { activeTab: pathActiveTab, variant } = resolveAccountTabFromPathname(pathname);
  const activeTab = explicitActiveTab || pathActiveTab;
  const content = children || renderAccountSectionSkeleton(explicitActiveTab || variant);

  return (
    <AccountSkeletonLayout activeTab={activeTab}>
      {content}
    </AccountSkeletonLayout>
  );
}

/**
 * Root account loading fallback.
 * Returning null here is CRITICAL:
 * Prevents Next.js router Suspense from replacing the real Navbar and Hero
 * with the full AccountSkeletonLayout (skeleton hero + skeleton navbar)
 * during account tab transitions.
 */
export default function AccountLoading() {
  return <AccountSkeleton />;
}
