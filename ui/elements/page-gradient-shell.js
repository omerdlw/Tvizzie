'use client';

import { cn } from '@/core/utils';

const PAGE_GRADIENT_BACKDROP_STYLE = Object.freeze({
  backgroundImage: `linear-gradient(
      to bottom,
      color-mix(in srgb, var(--white) 38%, transparent) 0%,
      color-mix(in srgb, var(--white) 52%, transparent) 18vh,
      color-mix(in srgb, var(--white) 68%, transparent) 34vh,
      color-mix(in srgb, var(--white) 83%, transparent) 50vh,
      color-mix(in srgb, var(--white) 94%, transparent) 66vh,
      var(--white) 80vh,
      var(--white) 100%
    )`,
});

export function PageGradientShell({ children, className, contentClassName, navHeight = 0 }) {
  const backdropExtension = Math.max(0, Math.round(navHeight || 0));

  return (
    <div className={cn('relative min-h-dvh w-full', className)}>
      <div
        className="pointer-events-none absolute inset-0 z-0"
        style={{ ...PAGE_GRADIENT_BACKDROP_STYLE, bottom: -backdropExtension }}
      />
      <div className={cn('relative z-10', contentClassName)}>{children}</div>
    </div>
  );
}
