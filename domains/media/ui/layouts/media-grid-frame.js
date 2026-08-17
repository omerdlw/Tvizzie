'use client';

import { PAGE_SHELL_MAX_WIDTH_CLASS } from '@/domains/shell/shared/constants';
import { cn } from '@/domains/shell/shared/utils';

export default function MediaGridFrame({ className = '', style, showSidebarBorder = false }) {
  return (
    <div
      aria-hidden="true"
      style={style}
      className={cn(
        `pointer-events-none absolute inset-y-0 left-1/2 z-0 min-h-dvh w-full -translate-x-1/2 ${PAGE_SHELL_MAX_WIDTH_CLASS}`,
        className,
      )}
    >
      <div className="absolute inset-y-0 left-0 w-px bg-white/10 backdrop-blur-sm" />
      {showSidebarBorder ? (
        <div className="absolute inset-y-0 left-96 hidden w-px bg-white/10 backdrop-blur-sm lg:block" />
      ) : null}
      <div className="absolute inset-y-0 right-0 w-px bg-white/10 backdrop-blur-sm" />
    </div>
  );
}
