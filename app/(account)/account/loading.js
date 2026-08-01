'use client';

import AccountRouteSkeleton from '@/domains/account/ui/account-skeleton';
import Registry from '@/domains/account/screens/account-overview-registry';

export default function AccountLoading() {
  return (
    <>
      <Registry isPageLoading={true} />
      <AccountRouteSkeleton variant="overview" />
    </>
  );
}
