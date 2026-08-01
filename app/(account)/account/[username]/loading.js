'use client';

import { usePathname } from 'next/navigation';
import AccountRouteSkeleton, { resolveAccountSkeletonVariant } from '@/domains/account/ui/account-skeleton';
import Registry from '@/domains/account/screens/account-profile-registry';

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
