'use client';

import { AccountSkeleton } from '@/app/(account)/account/loading';
import { Registry } from '@/app/(account)/account/[username]/watched/client';

export default function Loading() {
  return (
    <>
      <Registry isPageLoading={true} />
      <AccountSkeleton />
    </>
  );
}
