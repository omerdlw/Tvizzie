'use client';

import { ACCOUNT_ROUTE_SHELL_CLASS } from '@/shared/constants';
import { cn } from '@/shared/utils';

export default function AccountGridFrame({ className = '' }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        `pointer-events-none absolute inset-y-0 left-1/2 z-0 w-full -translate-x-1/2 ${ACCOUNT_ROUTE_SHELL_CLASS}`,
        className,
      )}
    >
      <div className="absolute inset-y-0 left-0 w-px bg-black/10" />
      <div className="absolute inset-y-0 right-0 w-px bg-black/10" />
    </div>
  );
}
