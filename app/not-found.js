'use client'

import { useRegistry } from '@/lib/hooks'
import { hexToRgba } from '@/lib/utils'

import NotFoundTemplate from '@/components/shared/not-found-template'
import Template from './template'

export default function NotFound() {
  const errorColor = 'var(--color-error)'
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
            color: 'var(--color-white)',
          },
          shortcutBadge: {
            background: alpha20,
            borderColor: alpha30,
            color: 'var(--color-white)',
            opacity: 1,
          },
        },
        hover: {
          icon: {
            background: alpha60,
            color: 'var(--color-white)',
          },
          shortcutBadge: {
            background: alpha20,
            borderColor: alpha40,
            color: 'var(--color-white)',
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
        <NotFoundTemplate
          title="Page not found"
          description="The page you are looking for does not exist or is no longer available."
        />
      </div>
    </Template>
  )
}
