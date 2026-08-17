'use client';

import { useEffect } from 'react';

import { EVENT_TYPES, globalEvents } from '@/domains/shell/shared/events';
import { getErrorReporter } from '@/modules/error-boundary/reporter';
import FullscreenState from '@/domains/shell/shared/components/feedback/fullscreen-state';

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
