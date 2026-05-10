'use client';

import { usePathname } from 'next/navigation';

import AccountRouteSkeleton, { resolveAccountSkeletonVariant } from '@/features/account/skeletons';

export function AccountSectionLoading({ Registry, registryProps = null, variant }) {
  return (
    <>
      <Registry {...(registryProps || { isPageLoading: true })} />
      <AccountRouteSkeleton variant={variant} />
    </>
  );
}

export function AccountPathLoading({ Registry }) {
  const pathname = usePathname();

  return <AccountSectionLoading Registry={Registry} variant={resolveAccountSkeletonVariant(pathname)} />;
}
