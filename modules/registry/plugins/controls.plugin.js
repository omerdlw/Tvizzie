import { REGISTRY_TYPES } from '../context'
import { createPlugin } from './create-plugin'
import { splitRegistryConfig } from './registry-meta'

export const controlsPlugin = createPlugin({
  name: 'controls',
  apply: (config, { register, unregister }) => {
    const controls = config?.controls
    if (!controls) return

    const { payload, registerOptions, source } = splitRegistryConfig(controls)

    register(
      REGISTRY_TYPES.CONTROLS,
      'page-controls',
      payload,
      source,
      registerOptions
    )

    return () => {
      unregister(REGISTRY_TYPES.CONTROLS, 'page-controls', source)
    }
  },
})
