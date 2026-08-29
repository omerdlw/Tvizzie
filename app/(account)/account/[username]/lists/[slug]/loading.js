'use client';

import { useAccountProfileShell } from '@/domains/account/ui/layouts/account-profile-context';
import { AccountSkeleton, AccountListDetailSkeleton } from '@/domains/account/ui/skeletons';

export default function Loading() {
  const profileShell = useAccountProfileShell();

  if (!profileShell) {
    return (
      <AccountSkeleton activeTab="lists">
        <AccountListDetailSkeleton />
      </AccountSkeleton>
    );
  }

  return <AccountListDetailSkeleton />;
}
