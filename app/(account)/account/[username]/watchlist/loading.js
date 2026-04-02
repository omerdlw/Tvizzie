'use client'

import AccountRouteSkeleton from '@/ui/skeletons/views/account'
import Registry from './registry'

export default function Loading() {
  return (
    <>
      <Registry
        isPageLoading={true}
        isResolvingProfile={true}
        registrySource="account-watchlist-loading"
      />
      <AccountRouteSkeleton variant="collection" />
    </>
  )
}
