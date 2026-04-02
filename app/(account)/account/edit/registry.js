'use client'

import { buildAccountEditState } from '@/features/account/account-registry-config'
import { useRegistry } from '@/modules/registry'

const ACCOUNT_EDIT_REGISTRY_SOURCE = 'account-edit'

export default function Registry(props) {
  useRegistry(
    buildAccountEditState({
      navRegistrySource: ACCOUNT_EDIT_REGISTRY_SOURCE,
      ...props,
    })
  )

  return null
}
