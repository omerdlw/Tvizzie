'use client';

import RouteErrorState from '@/ui/states/route-error';

export default function AccountError({ error, reset }) {
  return (
    <RouteErrorState
      error={error}
      fallbackMessage="An error occurred on the account page"
      reset={reset}
      source="Nextjs-Account-Error-File"
    />
  );
}
