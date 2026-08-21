'use client';

import { usePathname } from 'next/navigation';
import {
  AccountSkeleton,
  renderAccountSectionSkeleton,
  resolveAccountTabFromPathname,
} from '@/domains/account/ui/skeletons';
import { useAccountProfileShell } from '@/domains/account/ui/layouts/account-profile-context';

/**
 * Section-only loading boundary for /account/[username]/* routes.
 *
 * Placed inside /account/[username]/ so that Next.js wraps ONLY the {children}
 * slot in <main>. The parent ProfileLayout (Real Navbar, Real Hero, Real Background)
 * stays permanently mounted and visible on initial load and during tab transitions.
 */
export default function AccountUserSubrouteLoading() {
  const pathname = usePathname();
  const { variant } = resolveAccountTabFromPathname(pathname);
  const profileShell = useAccountProfileShell();
  return profileShell ? (
    renderAccountSectionSkeleton(variant)
  ) : (
    <AccountSkeleton activeTab={variant} />
  );
}
