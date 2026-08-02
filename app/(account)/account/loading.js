'use client';

import Registry from '@/app/(account)/registry';
import { Spinner } from '@/ui/feedback/spinner';

export function AccountSkeleton() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center py-12">
      <Spinner size={32} />
    </div>
  );
}

export default function AccountLoading() {
  return (
    <>
      <Registry isPageLoading={true} />
      <AccountSkeleton />
    </>
  );
}
