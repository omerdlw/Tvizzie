'use client';

import { cn } from '@/core/utils';
import { useNavHeight } from '@/core/modules/nav/hooks';

export const PAGE_GRADIENT_BACKDROP_CLASS =
  'pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_bottom,rgba(250,249,245,0.3)_0%,rgba(250,249,245,0.42)_18vh,rgba(250,249,245,0.58)_34vh,rgba(250,249,245,0.76)_50vh,rgba(250,249,245,0.9)_66vh,#FAF9F5_80vh,#FAF9F5_100%)]';

export function PageGradientShell({ children, className, contentClassName }) {
  const { navHeight } = useNavHeight();
  const backdropExtension = Math.max(0, Math.round(navHeight || 0));

  return (
    <div className={cn('relative isolate z-0 min-h-dvh w-full', className)}>
      <div className={PAGE_GRADIENT_BACKDROP_CLASS} style={{ bottom: -backdropExtension }} />
      <div className={cn('relative z-10', contentClassName)}>{children}</div>
    </div>
  );
}
