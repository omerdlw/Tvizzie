import { REGISTRY_TYPES } from '../context'
import { createPlugin } from './create-plugin'

export const controlsPlugin = createPlugin({
  name: 'controls',
  apply: (config, { register, unregister }) => {
    const controls = config?.controls
    if (!controls) return

    register(REGISTRY_TYPES.CONTROLS, 'page-controls', controls, 'dynamic')

    return () => {
      unregister(REGISTRY_TYPES.CONTROLS, 'page-controls', 'dynamic')
    }
  },
})
