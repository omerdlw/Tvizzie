'use client';

import { ACCOUNT_ROUTE_SHELL_CLASS } from '@/domains/shell/shared/constants';
import { cn } from '@/domains/shell/shared/utils';

export default function AccountGridFrame({ className = '' }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        `pointer-events-none absolute inset-y-0 left-1/2 z-0 min-h-screen w-full -translate-x-1/2 ${ACCOUNT_ROUTE_SHELL_CLASS}`,
        className,
      )}
    >
      <div className="absolute inset-y-0 left-0 w-px bg-white/10 backdrop-blur-sm" />
      <div className="absolute inset-y-0 right-0 w-px bg-white/10 backdrop-blur-sm" />
    </div>
  );
}
