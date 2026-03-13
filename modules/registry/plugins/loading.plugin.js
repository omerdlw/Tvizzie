import { REGISTRY_TYPES } from '../context'
import { createPlugin } from './create-plugin'
import { splitRegistryConfig } from './registry-meta'

let loadingCleanupTimeout = null

export const loadingPlugin = createPlugin({
  name: 'loading',
  apply: (config, { register, unregister }) => {
    const loading = config?.loading
    if (!loading) return

    const {
      cleanupDelayMs,
      payload,
      registerOptions,
      source,
    } = splitRegistryConfig(loading, { defaultCleanupDelayMs: 600 })

    if (loadingCleanupTimeout) {
      clearTimeout(loadingCleanupTimeout)
      loadingCleanupTimeout = null
    }

    register(
      REGISTRY_TYPES.LOADING,
      'page-loading',
      payload,
      source,
      registerOptions
    )

    return () => {
      if (loadingCleanupTimeout) {
        clearTimeout(loadingCleanupTimeout)
      }

      loadingCleanupTimeout = setTimeout(() => {
        unregister(REGISTRY_TYPES.LOADING, 'page-loading', source)
        loadingCleanupTimeout = null
      }, cleanupDelayMs)
    }
  },
})
