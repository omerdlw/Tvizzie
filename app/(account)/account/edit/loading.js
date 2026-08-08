'use client';

import { AccountEditRegistry as Registry } from '@/app/(account)/registry';
import { AccountSkeletonLayout } from '@/domains/account/ui/skeletons/account-skeleton-layout';
import { AccountEditSkeleton } from '@/domains/account/ui/skeletons/account-section-skeletons';

export default function AccountEditLoading() {
  return (
    <>
      <Registry isLoading={true} />
      <AccountSkeletonLayout activeTab="overview">
        <AccountEditSkeleton />
      </AccountSkeletonLayout>
    </>
  );
}
