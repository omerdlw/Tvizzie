'use client';

import { AccountEditRegistry as Registry } from '@/app/(account)/registry';
import {
  AccountSkeletonLayout,
} from '@/domains/account/ui/skeletons';
import {
  AccountEditSkeleton,
} from '@/domains/account/ui/skeletons';

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
