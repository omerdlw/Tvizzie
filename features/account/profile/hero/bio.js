'use client';

import { useEffect, useRef, useState } from 'react';

import { cn } from '@/core/utils';
import { HeroRevealItem } from './metrics';

export default function HeroBioPreview({ description, onReadMore }) {
  const textRef = useRef(null);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const shouldShowReadMore = isOverflowing && typeof onReadMore === 'function';

  useEffect(() => {
    const textElement = textRef.current;

    if (!textElement || !description) {
      setIsOverflowing(false);
      return;
    }

    const updateOverflowState = () => {
      setIsOverflowing(textElement.scrollHeight > textElement.clientHeight + 1);
    };

    updateOverflowState();

    if (document.fonts?.ready) {
      document.fonts.ready.then(updateOverflowState).catch(() => {});
    }

    if (typeof ResizeObserver !== 'function') {
      return;
    }

    const observer = new ResizeObserver(updateOverflowState);
    observer.observe(textElement);

    return () => observer.disconnect();
  }, [description]);

  if (!description) {
    return null;
  }

  return (
    <HeroRevealItem className="relative mt-2 w-full">
      <p ref={textRef} className={cn('line-clamp-2 text-sm leading-6 wrap-break-word')}>
        {description}
      </p>
      {shouldShowReadMore ? (
        <div
          className={cn(
            'account-hero-text-fade absolute right-0 bottom-0 flex h-[24px] items-center justify-end pl-12'
          )}
        >
          <button className="text-sm font-semibold text-white/70 uppercase" type="button" onClick={onReadMore}>
            More
          </button>
        </div>
      ) : null}
    </HeroRevealItem>
  );
}
