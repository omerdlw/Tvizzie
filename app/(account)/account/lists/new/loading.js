'use client';

import AccountRouteSkeleton from '@/ui/skeletons/views/account';
import Registry from './registry';

export default function Loading() {
  return (
    <>
      <Registry authIsReady={false} isLoading={true} />
      <AccountRouteSkeleton variant="list-builder" />
    </>
  );
}
