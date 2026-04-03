import { REGISTRY_TYPES } from '../context'
import { createPlugin } from './create-plugin'
import { splitRegistryConfig } from './registry-meta'

export const modalPlugin = createPlugin({
  name: 'modals',
  apply: (config, { batch, register, unregister }) => {
    const modals = config?.modal || config?.modals
    if (!modals) return

    const modalConfig = Array.isArray(modals)
      ? Object.assign({}, ...modals)
      : modals

    const { payload, registerOptions, source } =
      splitRegistryConfig(modalConfig)
    const modalItems = Object.entries(
      payload && typeof payload === 'object' && !Array.isArray(payload)
        ? payload
        : {}
    ).filter(([key]) => key !== 'registry')

    if (modalItems.length === 0) return

    if (typeof batch === 'function') {
      batch((queue) => {
        modalItems.forEach(([key, component]) => {
          queue.register(
            REGISTRY_TYPES.MODAL,
            key,
            component,
            source,
            registerOptions
          )
        })
      })
    } else {
      modalItems.forEach(([key, component]) => {
        register(REGISTRY_TYPES.MODAL, key, component, source, registerOptions)
      })
    }

    return () => {
      if (typeof batch === 'function') {
        batch((queue) => {
          modalItems.forEach(([key]) => {
            queue.unregister(REGISTRY_TYPES.MODAL, key, source)
          })
        })
        return
      }

      modalItems.forEach(([key]) => {
        unregister(REGISTRY_TYPES.MODAL, key, source)
      })
    }
  },
})
