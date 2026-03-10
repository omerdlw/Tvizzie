import { REGISTRY_TYPES } from '../context'
import { createPlugin } from './create-plugin'

export const loadingPlugin = createPlugin({
  name: 'loading',
  apply: (config, { register, unregister }) => {
    const loading = config?.loading
    if (!loading) return

    register(REGISTRY_TYPES.LOADING, 'page-loading', loading, 'dynamic')

    return () => {
      setTimeout(() => {
        unregister(REGISTRY_TYPES.LOADING, 'page-loading', 'dynamic')
      }, 600)
    }
  },
})
