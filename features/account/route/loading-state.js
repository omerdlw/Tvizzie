'use client';

import { usePathname } from 'next/navigation';

import AccountRouteSkeleton, { resolveAccountSkeletonVariant } from '@/ui/skeletons/views/account';

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
