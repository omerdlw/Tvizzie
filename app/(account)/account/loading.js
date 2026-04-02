'use client'

import AccountRouteSkeleton from '@/ui/skeletons/views/account'
import Registry from './registry'

export default function AccountLoading() {
  return (
    <>
      <Registry
        isPageLoading={true}
        isResolvingProfile={true}
        registrySource="account-overview-loading"
      />
      <AccountRouteSkeleton variant="overview" />
    </>
  )
}
