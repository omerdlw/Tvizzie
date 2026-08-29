'use client';

import { cn } from '@/ui/class-names';

export const PAGE_GRADIENT_BACKDROP_CLASS =
  'page-gradient-backdrop pointer-events-none absolute inset-0';

export function PageGradientShell({
  backdropClassName,
  children,
  className,
  contentClassName,
  navHeight = 0,
}) {
  const backdropExtension = Math.max(0, Math.round(navHeight || 0));

  return (
    <div className={cn('relative min-h-dvh w-full', className)}>
      <div
        className={cn(PAGE_GRADIENT_BACKDROP_CLASS, backdropClassName, 'z-0')}
        style={{ bottom: -backdropExtension }}
      />
      <div className={cn('relative z-10', contentClassName)}>{children}</div>
    </div>
  );
}
