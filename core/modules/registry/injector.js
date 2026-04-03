'use client'

import { useEffect } from 'react'

import { useRegistryContext } from './context'

export const RegistryInjector = ({ items, type }) => {
  const { batch, register, unregister } = useRegistryContext()

  useEffect(() => {
    if (!items || !type) return
    const entries = Object.entries(items)
    if (entries.length === 0) return

    if (typeof batch === 'function') {
      batch((queue) => {
        entries.forEach(([key, item]) => {
          queue.register(type, key, item)
        })
      })
    } else {
      entries.forEach(([key, item]) => {
        register(type, key, item)
      })
    }

    return () => {
      if (typeof batch === 'function') {
        batch((queue) => {
          entries.forEach(([key]) => {
            queue.unregister(type, key)
          })
        })
        return
      }

      entries.forEach(([key]) => {
        unregister(type, key)
      })
    }
  }, [batch, items, type, register, unregister])

  return null
}
