'use client';

import { usePathname } from 'next/navigation';
import {
  AccountSkeleton,
  renderAccountSectionSkeleton,
  resolveAccountTabFromPathname,
} from '@/domains/account/ui/skeletons';
import { useAccountProfileShell } from '@/domains/account/ui/layouts/account-profile-context';

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
