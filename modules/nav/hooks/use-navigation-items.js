'use client'

import { useMemo } from 'react'

import { useNavRegistry } from '@/modules/registry/context'

import { useNavigationContext } from '../context'

export const useNavigationItems = () => {
  const { config } = useNavigationContext()
  const { getAll } = useNavRegistry()

  const rawItems = useMemo(() => {
    const registeredItems = getAll()
    const navItems = config?.items || {}
    const configPaths = Object.values(navItems).map(
      (item) => item.path || item.name
    )
    const orderedItems = []

    configPaths.forEach((key) => {
      if (registeredItems[key]) orderedItems.push(registeredItems[key])
    })

    Object.entries(registeredItems).forEach(([key, item]) => {
      if (!configPaths.includes(key)) orderedItems.push(item)
    })

    return orderedItems
  }, [getAll, config])

  return { rawItems }
}
