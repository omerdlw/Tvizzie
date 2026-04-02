'use client'

import {
  Children,
  cloneElement,
  isValidElement,
  useEffect,
  useMemo,
  useRef,
} from 'react'

import { usePathname } from 'next/navigation'

import { useToast } from '@/modules/notification/hooks'

import { useRegistryActions } from './context'
import { PLUGINS, createPluginRunner } from './plugins'

function useStableDiff(value, compareFn) {
  const ref = useRef(value)

  if (!compareFn(ref.current, value)) {
    ref.current = value
  }

  return ref.current
}

function createStableFunctionEntry(fn) {
  const entry = {
    current: fn,
    stable(...args) {
      return entry.current?.apply(this, args)
    },
  }

  return entry
}

function isDirectRegistryComponentPath(path) {
  return /^config\.(modal|modals)\.[^.[]+$/.test(path)
}

function isReactNodeLike(value) {
  return (
    value === null ||
    value === undefined ||
    typeof value === 'boolean' ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    isValidElement(value)
  )
}

function stabilizeRegistryValue(value, path, functionEntries, usedPaths) {
  if (typeof value === 'function') {
    const isComponent = value.name && /^[A-Z]/.test(value.name)

    if (isComponent || isDirectRegistryComponentPath(path)) {
      return value
    }

    usedPaths.add(path)

    let entry = functionEntries.get(path)

    if (!entry) {
      entry = createStableFunctionEntry(value)
      functionEntries.set(path, entry)
    } else {
      entry.current = value
    }

    return entry.stable
  }

  if (isValidElement(value)) {
    const nextProps = stabilizeRegistryValue(
      value.props,
      `${path}.props`,
      functionEntries,
      usedPaths
    )

    return cloneElement(value, nextProps)
  }

  if (Array.isArray(value)) {
    const nextValue =
      value.every(isReactNodeLike) ? Children.toArray(value) : value

    return nextValue.map((item, index) =>
      stabilizeRegistryValue(item, `${path}[${index}]`, functionEntries, usedPaths)
    )
  }

  if (typeof value !== 'object' || value === null) {
    return value
  }

  return Object.keys(value).reduce((acc, key) => {
    acc[key] = stabilizeRegistryValue(
      value[key],
      `${path}.${key}`,
      functionEntries,
      usedPaths
    )
    return acc
  }, {})
}

function useStabilizedRegistryConfig(config) {
  const functionEntriesRef = useRef(new Map())

  return useMemo(() => {
    const usedPaths = new Set()
    const stabilizedConfig = stabilizeRegistryValue(
      config,
      'config',
      functionEntriesRef.current,
      usedPaths
    )

    functionEntriesRef.current.forEach((_entry, path) => {
      if (!usedPaths.has(path)) {
        functionEntriesRef.current.delete(path)
      }
    })

    return stabilizedConfig
  }, [config])
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

  const stabilizedConfig = useStabilizedRegistryConfig(config)
  const stableConfig = useStableDiff(stabilizedConfig, deepCompare)

  const runner = useMemo(() => createPluginRunner(PLUGINS), [])

  useEffect(() => {
    return runner.apply(stableConfig, context)
  }, [stableConfig, runner, context])
}
