'use client';

import { useMemo } from 'react';
import { cn } from '@/shared/utils';

export function BlurryText({
  children,
  text,
  className,
  segmentClassName,
  as: Component = 'div',
  by = 'character',
  delay = 0.15,
  duration = 0.75,
  stagger = 0.038,
  initialBlur = 'blur(14px)',
  initialY = 16,
  initialScale = 0.92,
  ease = [0.19, 1, 0.22, 1],
  ...props
}) {
  const content = useMemo(() => {
    if (typeof children === 'string') return children;
    if (typeof children === 'number') return String(children);
    if (typeof text === 'string') return text;
    if (typeof text === 'number') return String(text);
    return '';
  }, [children, text]);

  const words = useMemo(() => {
    if (!content) return [];
    return content.split(' ');
  }, [content]);

  if (!content) return null;

  let globalCharIndex = 0;

  return (
    <Component className={cn('whitespace-pre-wrap', className)} {...props}>
      {by === 'character'
        ? words.map((word, wordIndex) => {
            const chars = word.split('');
            return (
              <span key={`word-${wordIndex}`} className="inline-block whitespace-nowrap">
                {chars.map((char) => {
                  const charIndex = globalCharIndex++;
                  const itemDelay = delay + charIndex * stagger;

                  return (
                    <span
                      key={`char-${charIndex}`}
                      className={cn('inline-block', segmentClassName)}
                    >
                      {char}
                    </span>
                  );
                })}
                {wordIndex < words.length - 1 && <span className="inline-block">&nbsp;</span>}
              </span>
            );
          })
        : words.map((word, wordIndex) => {
            const itemDelay = delay + wordIndex * (stagger * 3);
            return (
              <span key={`word-${wordIndex}`} className={cn('inline-block', segmentClassName)}>
                {word}
                {wordIndex < words.length - 1 && <span className="inline-block">&nbsp;</span>}
              </span>
            );
          })}
    </Component>
  );
}

export default BlurryText;
