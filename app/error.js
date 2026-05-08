'use client';

import RouteErrorState from '@/ui/states/route-error';

export default function Error({ error, reset }) {
  return (
    <RouteErrorState
      error={error}
      fallbackMessage="A page-level error occurred"
      reset={reset}
      source="Nextjs-App-Error-File"
    />
  );
}
