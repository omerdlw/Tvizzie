'use client';

import { PAGE_SHELL_MAX_WIDTH_CLASS } from '@/shared/constants';
import { cn } from '@/shared/utils';

export default function PersonGridFrame({ className = '' }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        `pointer-events-none absolute inset-y-0 left-1/2 z-0 min-h-screen w-full -translate-x-1/2 ${PAGE_SHELL_MAX_WIDTH_CLASS}`,
        className,
      )}
    >
      <div className="absolute inset-y-0 left-0 w-px bg-white/10" />
      <div className="absolute inset-y-0 right-0 w-px bg-white/10" />
    </div>
  );
}
