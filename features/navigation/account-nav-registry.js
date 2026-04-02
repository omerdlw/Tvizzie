'use client'

import { useEffect, useMemo } from 'react'

import { useCurrentAccount } from '@/modules/account'
import { useNavRegistry } from '@/modules/registry'
import { buildAccountChildren } from './account-nav-links'

const ACCOUNT_NAV_KEY = '/account'
const ACCOUNT_CHILDREN_SOURCE = 'account-children'
const ACCOUNT_CHILDREN_PRIORITY = 150

export default function AccountNavRegistry() {
  const currentAccount = useCurrentAccount()
  const { register, unregister } = useNavRegistry()
  const resolvedUsername = useMemo(
    () => String(currentAccount?.username || '').trim(),
    [currentAccount?.username]
  )
  const children = useMemo(
    () => buildAccountChildren(resolvedUsername),
    [resolvedUsername]
  )

  useEffect(() => {
    const hasRoutableChildren = children.some((child) => Boolean(child.path))

    if (!hasRoutableChildren) {
      unregister(ACCOUNT_NAV_KEY, { source: ACCOUNT_CHILDREN_SOURCE })
      return undefined
    }

    register(
      ACCOUNT_NAV_KEY,
      {
        children,
      },
      {
        priority: ACCOUNT_CHILDREN_PRIORITY,
        source: ACCOUNT_CHILDREN_SOURCE,
      }
    )

    return () => {
      unregister(ACCOUNT_NAV_KEY, { source: ACCOUNT_CHILDREN_SOURCE })
    }
  }, [children, register, unregister])

  return null
}
