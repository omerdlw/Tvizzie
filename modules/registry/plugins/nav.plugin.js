import { REGISTRY_TYPES } from '../context'
import { createPlugin } from './create-plugin'

export const navPlugin = createPlugin({
  name: 'nav',
  apply: (config, { register, unregister, pathname }) => {
    const nav = config?.nav
    if (!nav) return

    const itemPath = nav.path || pathname

    const navItem = {
      ...nav,
      path: itemPath,
      action: nav.action,
      actions: nav.actions,
    }

    if (itemPath) {
      register(REGISTRY_TYPES.NAV, itemPath, navItem, 'dynamic')
    }

    return () => {
      if (itemPath) {
        unregister(REGISTRY_TYPES.NAV, itemPath, 'dynamic')
      }
    }
  },
})
