'use client';

import { AccountSkeleton } from '@/app/(account)/account/loading';
import { Registry } from '@/app/(account)/account/[username]/activity/client';

export default function AccountLoading() {
  return (
    <>
      <Registry isPageLoading={true} />
      <AccountSkeleton />
    </>
  );
}
