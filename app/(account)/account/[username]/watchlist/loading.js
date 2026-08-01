'use client';

import AccountRouteSkeleton from '@/domains/account/ui/account-skeleton';
import { Registry } from '@/domains/account/screens/account-watchlist-page';

export default function Loading() {
  return (
    <>
      <Registry isPageLoading={true} />
      <AccountRouteSkeleton variant="collection" />
    </>
  );
}
