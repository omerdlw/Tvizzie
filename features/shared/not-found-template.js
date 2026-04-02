'use client'

import NotFoundAction from '@/features/navigation/actions/not-found-action'
import { useRegistry } from '@/modules/registry'
import { FullscreenState } from '@/ui/fullscreen-state'

export default function NotFoundTemplate({ description }) {
  useRegistry({
    nav: {
      description: 'The page you were looking for was not found',
      icon: 'solar:forbidden-circle-bold',
      action: <NotFoundAction />,
      isNotFound: true,
      title: '404',
    },
  })

  return (
    <FullscreenState>
      <p className="text-center">{description}</p>
    </FullscreenState>
  )
}
