import { REGISTRY_TYPES } from '../context'
import { createPlugin } from './create-plugin'

export const contextMenuPlugin = createPlugin({
  name: 'contextMenu',
  apply: (config, { register, unregister, pathname }) => {
    const contextMenu = config?.contextMenu
    if (!contextMenu) return

    const key = pathname || 'current-page'

    register(REGISTRY_TYPES.CONTEXT_MENU, key, contextMenu, 'dynamic')

    return () => {
      unregister(REGISTRY_TYPES.CONTEXT_MENU, key, 'dynamic')
    }
  },
})
