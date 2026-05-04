'use client';

import { cn } from '@/core/utils';

export function TextAnimate({
  children,
  className,
  as: Component = 'p',
  delay,
  duration,
  segmentClassName,
  startOnView,
  once,
  by,
  animation,
  ...props
}) {
  return (
    <Component className={cn('whitespace-pre-wrap', className)} {...props}>
      {children}
    </Component>
  );
}
