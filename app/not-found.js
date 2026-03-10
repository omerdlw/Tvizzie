'use client'

import { useRegistry } from '@/lib/hooks'
import { hexToRgba } from '@/lib/utils'

import Template from './template'

export default function NotFound() {
  const errorColor = 'var(--color-error, #d43333)'
  const alpha40 = hexToRgba(errorColor, 0.4)
  const alpha60 = hexToRgba(errorColor, 0.6)
  const alpha20 = hexToRgba(errorColor, 0.2)
  const alpha30 = hexToRgba(errorColor, 0.3)

  useRegistry({
    nav: {
      path: 'not-found',
      type: 'NOT_FOUND',
      description: 'Page not found',
      title: 'Not Found',
      icon: 'solar:forbidden-circle-bold',
      style: {
        active: {
          card: {
            background: `linear-gradient(125deg, ${alpha20}, rgba(0,0,0,0.5))`,
            borderColor: alpha40,
          },
          icon: {
            background: alpha40,
            color: '#ffffff',
          },
          shortcutBadge: {
            background: alpha20,
            borderColor: alpha30,
            color: '#ffffff',
            opacity: 1,
          },
        },
        hover: {
          icon: {
            background: alpha60,
            color: '#ffffff',
          },
          shortcutBadge: {
            background: alpha20,
            borderColor: alpha40,
            color: '#ffffff',
            opacity: 1,
          },
        },
      },
      hideSettings: true,
      hideScroll: true,
    },
  })

  return (
    <Template>
      <div className="center relative h-screen w-screen">
        <div className="absolute top-2/4 left-2/4 flex -translate-x-2/4 -translate-y-2/4 flex-col items-center space-y-3">
          <h1 className="text-3xl font-bold opacity-50">PAGE NOT FOUND</h1>
        </div>
      </div>
    </Template>
  )
}
