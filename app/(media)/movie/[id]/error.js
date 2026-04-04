'use client';

import { useEffect } from 'react';

import { FullscreenState } from '@/ui/states/fullscreen-state';
import { EVENT_TYPES, globalEvents } from '@/core/constants/events';
import { getErrorReporter } from '@/core/modules/error-boundary/reporter';

export default function MovieDetailError({ error, reset }) {
  useEffect(() => {
    getErrorReporter().captureError(error, {
      source: 'Nextjs-Movie-Detail-Error-File',
    });

    globalEvents.emit(EVENT_TYPES.APP_ERROR, {
      message: error?.message || 'An error occurred on the movie detail page',
      resetError: reset,
      error,
    });
  }, [error, reset]);

  return <FullscreenState />;
}
