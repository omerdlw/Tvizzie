import { backgroundPlugin } from './background.plugin'
import { contextMenuPlugin } from './context-menu.plugin'
import { controlsPlugin } from './controls.plugin'
import { guardPlugin } from './guard.plugin'
import { loadingPlugin } from './loading.plugin'
import { modalPlugin } from './modal.plugin'
import { navPlugin } from './nav.plugin'
import { notificationPlugin } from './notification.plugin'

import { titlePlugin } from './title.plugin'

export const PLUGINS = [
  titlePlugin,
  contextMenuPlugin,
  navPlugin,
  modalPlugin,
  backgroundPlugin,
  controlsPlugin,
  loadingPlugin,

  guardPlugin,
  notificationPlugin,
]

export function createPluginRunner(plugins) {
  return {
    apply: (config, context) => {
      if (!config) return () => { }

      const cleanups = plugins.map((plugin) => {
        try {
          return plugin.apply(config, context)
        } catch (e) {
          console.error(`[PluginRunner] Error in plugin ${plugin.name}:`, e)
          return null
        }
      })

      return () => {
        cleanups.forEach((cleanup) => {
          if (typeof cleanup === 'function') {
            try {
              cleanup()
            } catch (e) {
              console.error(`[PluginRunner] Error in cleanup:`, e)
            }
          }
        })
      }
    },
  }
}

export * from './create-plugin'
export * from './title.plugin'
export * from './context-menu.plugin'
export * from './nav.plugin'
export * from './modal.plugin'
export * from './background.plugin'
export * from './controls.plugin'
export * from './loading.plugin'

export * from './guard.plugin'
export * from './notification.plugin'
