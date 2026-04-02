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
    const fallbackSurface =
      navConfig.mask !== undefined
        ? {
            content: navConfig.mask,
            dismissible: navConfig.maskDismissible,
            onClose: navConfig.dismissMask,
          }
        : undefined

    const navItem = {
      ...navConfig,
      path: itemPath,
      action: navConfig.action,
      actions: navConfig.actions,
      confirmation: navConfig.confirmation,
      surface: navConfig.surface ?? fallbackSurface,
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
