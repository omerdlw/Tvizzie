'use client';

import { usePathname } from 'next/navigation';
import AccountRouteSkeleton, { resolveAccountSkeletonVariant } from '@/ui/skeletons/views/account';
import Registry from './registry';

export default function Loading() {
  const pathname = usePathname();
  const variant = resolveAccountSkeletonVariant(pathname);

  return (
    <>
      <Registry isPageLoading={true} />
      <AccountRouteSkeleton variant={variant} />
    </>
  );
}
