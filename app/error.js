'use client'

import { useEffect } from 'react'

import { FullscreenState } from '@/ui/fullscreen-state'
import { EVENT_TYPES, globalEvents } from '@/lib/events'
import { getErrorReporter } from '@/modules/error-boundary/reporter'

export default function Error({ error, reset }) {
  useEffect(() => {
    getErrorReporter().captureError(error, {
      source: 'Nextjs-App-Error-File',
    })

    globalEvents.emit(EVENT_TYPES.APP_ERROR, {
      message: error?.message || 'A page-level error occurred',
      resetError: reset,
      error,
    })
  }, [error, reset])

  return <FullscreenState />
}
