'use client';

import { useAccountProfileShell } from '@/domains/account/ui/layouts/account-profile-context';
import { AccountSkeleton } from '@/app/(account)/account/loading';
import { AccountMediaGridSkeleton } from '@/domains/account/ui/skeletons/account-section-skeletons';

export default function Loading() {
  const profileShell = useAccountProfileShell();

  if (!profileShell) {
    return (
      <AccountSkeleton activeTab="lists">
        <AccountMediaGridSkeleton />
      </AccountSkeleton>
    );
  }

  return <AccountMediaGridSkeleton />;
}
