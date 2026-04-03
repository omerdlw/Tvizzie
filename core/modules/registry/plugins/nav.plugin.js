import { REGISTRY_TYPES } from '../context'
import { createPlugin } from './create-plugin'
import { splitRegistryConfig } from './registry-meta'

const navCleanupTimeouts = new Map()

function createCleanupKey(path, source) {
  return `${path}::${source}`
}

function clearCleanupTimer(path, source) {
  const cleanupKey = createCleanupKey(path, source)
  const timerId = navCleanupTimeouts.get(cleanupKey)

  if (!timerId) {
    return
  }

  clearTimeout(timerId)
  navCleanupTimeouts.delete(cleanupKey)
}

function getLoadingFallback(config) {
  const loading = config?.loading
  if (!loading || typeof loading !== 'object' || Array.isArray(loading)) {
    return undefined
  }

  const { payload } = splitRegistryConfig(loading)
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return undefined
  }

  if (!Object.prototype.hasOwnProperty.call(payload, 'isLoading')) {
    return undefined
  }

  return payload.isLoading
}

export const navPlugin = createPlugin({
  name: 'nav',
  apply: (config, { register, unregister, pathname }) => {
    const nav = config?.nav
    if (!nav) return

    const { cleanupDelayMs, payload, registerOptions, source } = splitRegistryConfig(
      nav,
      { defaultCleanupDelayMs: 0 }
    )
    const navConfig =
      payload && typeof payload === 'object' && !Array.isArray(payload)
        ? payload
        : {}

    const itemPath = navConfig.path || pathname
    const navItem = {
      ...navConfig,
      path: itemPath,
      action: navConfig.action,
      actions: navConfig.actions,
      confirmation: navConfig.confirmation,
      surface: navConfig.surface,
    }

    const resolvedIsLoading =
      navConfig.isLoading !== undefined
        ? navConfig.isLoading
        : getLoadingFallback(config)

    if (resolvedIsLoading !== undefined) {
      navItem.isLoading = resolvedIsLoading
    }

    if (itemPath) {
      clearCleanupTimer(itemPath, source)
      register(REGISTRY_TYPES.NAV, itemPath, navItem, source, registerOptions)
    }

    return () => {
      if (itemPath) {
        const cleanup = () => {
          unregister(REGISTRY_TYPES.NAV, itemPath, source)
          clearCleanupTimer(itemPath, source)
        }

        if (cleanupDelayMs > 0) {
          const cleanupKey = createCleanupKey(itemPath, source)
          const timerId = setTimeout(cleanup, cleanupDelayMs)
          navCleanupTimeouts.set(cleanupKey, timerId)
          return
        }

        cleanup()
      }
    }
  },
})
