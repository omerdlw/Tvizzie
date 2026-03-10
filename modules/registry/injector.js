'use client'

import { useEffect } from 'react'

import { useRegistryContext } from './context'

export const RegistryInjector = ({ items, type }) => {
  const { register, unregister } = useRegistryContext()

  useEffect(() => {
    if (!items || !type) return

    Object.entries(items).forEach(([key, item]) => {
      register(type, key, item)
    })

    return () => {
      Object.keys(items).forEach((key) => {
        unregister(type, key)
      })
    }
  }, [items, type, register, unregister])

  return null
}
