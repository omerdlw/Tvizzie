'use client';

import { cn } from '@/core/utils';

export const PAGE_GRADIENT_BACKDROP_CLASS =
  'pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(250,249,245,0.38)_0%,rgba(250,249,245,0.52)_18vh,rgba(250,249,245,0.68)_34vh,rgba(250,249,245,0.83)_50vh,rgba(250,249,245,0.94)_66vh,#FAF9F5_80vh,#FAF9F5_100%)]';

export function PageGradientShell({ children, className, contentClassName, navHeight = 0 }) {
  const backdropExtension = Math.max(0, Math.round(navHeight || 0));

  return (
    <div className={cn('relative min-h-dvh w-full', className)}>
      <div className={cn(PAGE_GRADIENT_BACKDROP_CLASS, 'z-0')} style={{ bottom: -backdropExtension }} />
      <div className={cn('relative z-10', contentClassName)}>{children}</div>
    </div>
  );
}
