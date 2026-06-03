'use client';

import { useMemo } from 'react';

import { cn } from '@/core/utils';

function splitSegments(value, by) {
  if (!value) {
    return [];
  }

  if (by === 'character') {
    return value.split('');
  }

  if (by === 'word') {
    return value.split(' ');
  }

  return [value];
}

export function TextAnimate({
  animation,
  children,
  className,
  delay,
  duration,
  once,
  segmentClassName,
  as: Component = 'p',
  startOnView,
  by = 'word',
  ...props
}) {
  void animation;
  void delay;
  void duration;
  void once;
  void startOnView;

  const resolvedText = useMemo(() => {
    if (typeof children === 'string') {
      return children;
    }

    if (typeof children === 'number') {
      return String(children);
    }

    return '';
  }, [children]);
  const segments = useMemo(() => splitSegments(resolvedText, by), [by, resolvedText]);

  if (segments.length === 0) {
    return null;
  }

  return (
    <Component className={cn('whitespace-pre-wrap', className)} {...props}>
      {segments.map((segment, index) => (
        <span key={`${by}-${index}-${segment}`} className={cn('inline-block', segmentClassName)}>
          {segment}
          {by === 'word' && index < segments.length - 1 ? <span className="inline-block">&nbsp;</span> : null}
        </span>
      ))}
    </Component>
  );
}
