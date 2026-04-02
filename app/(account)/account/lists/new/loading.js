'use client'

import AccountRouteSkeleton from '@/ui/skeletons/views/account'
import Registry from './registry'

export default function Loading() {
  return (
    <>
      <Registry
        isLoading={true}
        registrySource="account-lists-new-loading"
      />
      <AccountRouteSkeleton variant="lists" />
    </>
  )
}
