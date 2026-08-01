'use client';

import AccountRouteSkeleton from '@/domains/account/ui/account-skeleton';
import { Registry } from '@/domains/account/ui/activity-view';

export default function AccountLoading() {
  return (
    <>
      <Registry isPageLoading={true} />
      <AccountRouteSkeleton variant="activity" />
    </>
  );
}
