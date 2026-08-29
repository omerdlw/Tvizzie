'use client';

import { useEffect } from 'react';

import FullscreenState from '@/ui/feedback/fullscreen-state';
import { EVENT_TYPES, globalEvents } from '@/shared';
import { getErrorReporter } from '@/modules/error-boundary';

export default function Error({ error, reset }) {
  useEffect(() => {
    getErrorReporter().captureError(error, {
      source: 'Nextjs-App-Error-File',
    });

    globalEvents.emit(EVENT_TYPES.APP_ERROR, {
      message: error?.message || 'A page-level error occurred',
      resetError: reset,
      error,
    });
  }, [error, reset]);

  return <FullscreenState />;
}
