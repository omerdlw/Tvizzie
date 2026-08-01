'use client';

import { useEffect } from 'react';

import { EVENT_TYPES, globalEvents } from '@/shared/constants/events';
import { getErrorReporter } from '@/modules/error-boundary/reporter';
import FullscreenState from '@/ui/feedback/fullscreen-state';

export default function AuthError({ error, reset }) {
  useEffect(() => {
    getErrorReporter().captureError(error, {
      source: 'Nextjs-Auth-Error-File',
    });

    globalEvents.emit(EVENT_TYPES.APP_ERROR, {
      message: error?.message || 'An error occurred on the authentication page',
      resetError: reset,
      error,
    });
  }, [error, reset]);

  return <FullscreenState />;
}
