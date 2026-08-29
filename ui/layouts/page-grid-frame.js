'use client';

import { PAGE_SHELL_MAX_WIDTH_CLASS } from '@/shared';
import { cn } from '@/ui/class-names';

export function PageGridFrame({
  className = '',
  minHeightClassName = 'min-h-dvh',
  showSidebarDivider = false,
  style,
  widthClassName = PAGE_SHELL_MAX_WIDTH_CLASS,
}) {
  return (
    <div
      aria-hidden="true"
      style={style}
      className={cn(
        'pointer-events-none absolute inset-y-0 left-1/2 z-0 w-full -translate-x-1/2',
        minHeightClassName,
        widthClassName,
        className,
      )}
    >
      <div className="absolute inset-y-0 left-0 w-px bg-white/10 backdrop-blur" />
      {showSidebarDivider ? (
        <div className="absolute inset-y-0 left-96 hidden w-px bg-white/10 backdrop-blur lg:block" />
      ) : null}
      <div className="absolute inset-y-0 right-0 w-px bg-white/10 backdrop-blur" />
    </div>
  );
}
