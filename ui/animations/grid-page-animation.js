'use client';

import { createContext, useContext, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { cn } from '@/ui/elements/utils';

const GridPageAnimationContext = createContext({
  baseDelay: 0,
});

export function GridPageAnimationRoot({ baseDelay = 0, children, routeKey = null }) {
  const pathname = usePathname();
  const animationKey = routeKey ?? pathname ?? 'grid-page';
  const value = useMemo(
    () => ({
      baseDelay,
    }),
    [baseDelay]
  );

  return (
    <GridPageAnimationContext.Provider key={animationKey} value={value}>
      {children}
    </GridPageAnimationContext.Provider>
  );
}

export function GridPageLine({ className = '' }) {
  return (
    <span
      aria-hidden="true"
      className={cn('grid-page-line', className)}
    />
  );
}

export function GridPageNode({ children, className = '' }) {
  return (
    <span
      aria-hidden="true"
      className={className}
    >
      {children}
    </span>
  );
}
