import { REGISTRY_TYPES } from '../context'
import { createPlugin } from './create-plugin'
import { splitRegistryConfig } from './registry-meta'

export const navPlugin = createPlugin({
  name: 'nav',
  apply: (config, { register, unregister, pathname }) => {
    const nav = config?.nav
    if (!nav) return

    const { payload, registerOptions, source } = splitRegistryConfig(nav)
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
      mask: navConfig.mask,
    }

    if (itemPath) {
      register(REGISTRY_TYPES.NAV, itemPath, navItem, source, registerOptions)
    }

    return () => {
      if (itemPath) {
        unregister(REGISTRY_TYPES.NAV, itemPath, source)
      }
    }
  },
})
