'use client';

import AccountRouteSkeleton from '@/domains/account/ui/account-skeleton';
import Registry from '@/domains/account/ui/edit-registry';

export default function AccountEditLoading() {
  return (
    <>
      <Registry isLoading={true} />
      <AccountRouteSkeleton variant="edit" />
    </>
  );
}
