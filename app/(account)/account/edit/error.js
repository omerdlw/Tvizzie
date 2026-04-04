'use client';

import { useEffect } from 'react';

import { FullscreenState } from '@/ui/states/fullscreen-state';

export default function Error({ error, reset }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <FullscreenState contentClassName="center h-full w-full flex-col gap-3 p-6 text-center">
      <h1>Something went wrong</h1>
      <p>Account edit page could not be loaded.</p>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => reset()}>
          Try again
        </button>
        <button
          type="button"
          onClick={() => {
            window.location.href = '/account';
          }}
        >
          Go to account
        </button>
      </div>
    </FullscreenState>
  );
}
