'use client';

import { AccountSkeleton } from '@/app/(account)/account/loading';
import Registry from '@/app/(account)/registry';

export default function Loading() {
  return (
    <>
      <Registry isPageLoading={true} />
      <AccountSkeleton />
    </>
  );
}
