import { REGISTRY_TYPES } from '../context'
import { createPlugin } from './create-plugin'
import { splitRegistryConfig } from './registry-meta'

export const backgroundPlugin = createPlugin({
  name: 'background',
  apply: (config, { register, unregister }) => {
    const background = config?.background

    if (background) {
      const { payload, registerOptions, source } = splitRegistryConfig(
        background
      )

      register(
        REGISTRY_TYPES.BACKGROUND,
        'page-background',
        payload,
        source,
        registerOptions
      )

      return () => {
        unregister(REGISTRY_TYPES.BACKGROUND, 'page-background', source)
      }
    }
  },
})
