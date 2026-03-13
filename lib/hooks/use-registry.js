'use client'

import { isValidElement, useEffect, useMemo, useRef } from 'react'

import { usePathname } from 'next/navigation'

import { useToast } from '@/modules/notification/hooks'
import { useRegistryActions } from '@/modules/registry/context'
import { PLUGINS, createPluginRunner } from '@/modules/registry/plugins'

function useStableDiff(value, compareFn) {
  const ref = useRef(value)

  if (!compareFn(ref.current, value)) {
    ref.current = value
  }

  return ref.current
}

const deepCompare = (prev, next) => {
  if (Object.is(prev, next)) return true

  if (
    typeof prev !== 'object' ||
    prev === null ||
    typeof next !== 'object' ||
    next === null
  ) {
    return false
  }

  if (isValidElement(prev) && isValidElement(next)) {
    return (
      prev.type === next.type &&
      prev.key === next.key &&
      deepCompare(prev.props, next.props)
    )
  }

  if (Array.isArray(prev) !== Array.isArray(next)) return false

  const keys1 = Object.keys(prev)
  const keys2 = Object.keys(next)

  if (keys1.length !== keys2.length) return false

  for (const key of keys1) {
    if (
      !Object.prototype.hasOwnProperty.call(next, key) ||
      !deepCompare(prev[key], next[key])
    ) {
      return false
    }
  }

  return true
}

export function useRegistry(config) {
  const { batch, register, unregister } = useRegistryActions()
  const toast = useToast()
  const pathname = usePathname()
  const toastRef = useRef(toast)
  const hasShownMountNotification = useRef(false)

  toastRef.current = toast

  const context = useMemo(
    () => ({
      register,
      unregister,
      batch,
      pathname,
      get hasShownMountNotification() {
        return hasShownMountNotification.current
      },
      setHasShownMountNotification: (val) => {
        hasShownMountNotification.current = val
      },
      get toast() {
        return toastRef.current
      },
    }),
    [batch, register, unregister, pathname]
  )

  const stableConfig = useStableDiff(config, deepCompare)

  const runner = useMemo(() => createPluginRunner(PLUGINS), [])

  useEffect(() => {
    return runner.apply(stableConfig, context)
  }, [stableConfig, runner, context])
}
