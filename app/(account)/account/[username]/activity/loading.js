'use client';

import AccountRouteSkeleton from '@/ui/skeletons/views/account';
import Registry from './registry';

export default function AccountLoading() {
  return (
    <>
      <Registry isPageLoading={true} />
      <AccountRouteSkeleton variant="activity" />
    </>
  );
}
