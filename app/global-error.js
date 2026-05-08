'use client';

import RouteErrorState from '@/ui/states/route-error';

export default function GlobalError({ error, reset }) {
  return (
    <RouteErrorState
      error={error}
      fallbackMessage="A critical application error occurred"
      reset={reset}
      source="Nextjs-App-Global-Error-File"
    />
  );
}
