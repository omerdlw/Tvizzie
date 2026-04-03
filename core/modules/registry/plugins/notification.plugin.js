import { createPlugin } from './create-plugin'

export const notificationPlugin = createPlugin({
  name: 'notifications',
  apply: (config, context) => {
    const notifications = config?.notifications

    if (notifications?.onMount && !context.hasShownMountNotification) {
      context.setHasShownMountNotification(true)
      const { type = 'info', message, ...options } = notifications.onMount

      if (message && context.toast) {
        if (typeof context.toast[type] === 'function') {
          context.toast[type](message, options)
        } else {
          context.toast.show(type, message, options)
        }
      }
    }

    return () => {}
  },
})
