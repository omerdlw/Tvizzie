'use client';

import AccountRouteSkeleton from '@/ui/skeletons/views/account';
import Registry from './registry';

export default function AccountEditLoading() {
  return (
    <>
      <Registry isLoading={true} />
      <AccountRouteSkeleton variant="edit" />
    </>
  );
}
