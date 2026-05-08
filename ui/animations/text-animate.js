'use client';

import { cn } from '@/core/utils';

export function TextAnimate({
  children,
  className,
  as: Component = 'p',
  segmentClassName,
  startOnView,
  once,
  by,
  ...props
}) {
  return (
    <Component className={cn('whitespace-pre-wrap', className)} {...props}>
      {children}
    </Component>
  );
}
