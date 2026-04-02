'use client'

import { useEffect } from 'react'

import { FullscreenState } from '@/ui/fullscreen-state'
import { EVENT_TYPES, globalEvents } from '@/lib/events'
import { getErrorReporter } from '@/modules/error-boundary/reporter'

export default function PersonDetailError({ error, reset }) {
  useEffect(() => {
    getErrorReporter().captureError(error, {
      source: 'Nextjs-Person-Detail-Error-File',
    })

    globalEvents.emit(EVENT_TYPES.APP_ERROR, {
      message: error?.message || 'An error occurred on the person detail page',
      resetError: reset,
      error,
    })
  }, [error, reset])

  return <FullscreenState />
}
