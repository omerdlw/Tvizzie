'use client';

import { AccountSkeleton } from '@/app/(account)/account/loading';
import { AccountEditRegistry as Registry } from '@/app/(account)/registry';

export default function AccountEditLoading() {
  return (
    <>
      <Registry isLoading={true} />
      <AccountSkeleton />
    </>
  );
}
