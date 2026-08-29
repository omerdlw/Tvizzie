'use client';

import { useEffect } from 'react';

import { EVENT_TYPES, globalEvents } from '@/shared';
import { getErrorReporter } from '@/modules/error-boundary';
import FullscreenState from '@/ui/feedback/fullscreen-state';

export default function LegalError({ error, reset }) {
  useEffect(() => {
    getErrorReporter().captureError(error, {
      source: 'Nextjs-Legal-Error-File',
    });

    globalEvents.emit(EVENT_TYPES.APP_ERROR, {
      message: error?.message || 'An error occurred on a legal page',
      resetError: reset,
      error,
    });
  }, [error, reset]);

  return <FullscreenState />;
}
