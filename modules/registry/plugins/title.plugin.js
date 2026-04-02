'use client'

import { createPlugin } from './create-plugin'

export const titlePlugin = createPlugin({
  name: 'title',
  apply: (config) => {
    const title = config?.title
    if (!title) return

    const originalTitle = typeof document !== 'undefined' ? document.title : ''

    if (typeof document !== 'undefined') {
      document.title = title
    }

    return () => {
      if (typeof document !== 'undefined') {
        document.title = originalTitle
      }
    }
  },
})
