import { REGISTRY_TYPES } from '../context'
import { createPlugin } from './create-plugin'

export const modalPlugin = createPlugin({
  name: 'modals',
  apply: (config, { register, unregister }) => {
    const modals = config?.modal || config?.modals
    if (!modals) return

    const modalItems = Array.isArray(modals)
      ? Object.assign({}, ...modals)
      : modals

    Object.entries(modalItems).forEach(([key, component]) => {
      register(REGISTRY_TYPES.MODAL, key, component, 'dynamic')
    })

    return () => {
      Object.keys(modalItems).forEach((key) => {
        unregister(REGISTRY_TYPES.MODAL, key, 'dynamic')
      })
    }
  },
})
