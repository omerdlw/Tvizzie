'use client';

import { useEffect } from 'react';

import { EVENT_TYPES, globalEvents } from '@/core/constants/events';
import { getErrorReporter } from '@/core/modules/error-boundary/reporter';
import { FullscreenState } from '@/ui/states/fullscreen-state';

export default function RouteErrorState({ error, fallbackMessage, reset, source }) {
  useEffect(() => {
    getErrorReporter().captureError(error, { source });

    globalEvents.emit(EVENT_TYPES.APP_ERROR, {
      message: error?.message || fallbackMessage,
      resetError: reset,
      error,
    });
  }, [error, fallbackMessage, reset, source]);

  return <FullscreenState />;
}
