'use client';

import { useEffect, useRef, useState } from 'react';

import Image from 'next/image';

import { cn } from '@/core/utils';
import { Spinner } from '@/ui/loadings/spinner';

function getSafeSrc(src) {
  const value = String(src || '').trim();
  return value || null;
}

export default function AdaptiveImage({
  mode = 'next',
  src,
  alt = '',
  className = '',
  wrapperClassName = '',
  skeletonClassName = '',
  fill = false,
  onLoad,
  onError,
  ...props
}) {
  const imageRef = useRef(null);
  const resolvedSrc = getSafeSrc(src);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [hasFailed, setHasFailed] = useState(false);

  useEffect(() => {
    setHasLoaded(false);
    setHasFailed(false);
  }, [resolvedSrc]);

  useEffect(() => {
    const imageElement = imageRef.current;

    if (!imageElement) {
      return;
    }

    const syncLoadedState = () => {
      if (imageElement.complete && imageElement.naturalWidth > 0) {
        setHasLoaded(true);
        setHasFailed(false);
      }
    };

    syncLoadedState();

    const frameId = window.requestAnimationFrame(syncLoadedState);

    return () => window.cancelAnimationFrame(frameId);
  }, [mode, resolvedSrc]);

  if (!resolvedSrc) {
    return null;
  }

  const imageClassName = cn(
    fill ? 'absolute inset-0 h-full w-full' : 'h-full w-full',
    'transition-opacity duration-[300ms]',
    hasLoaded ? 'opacity-100' : 'opacity-0',
    className
  );

  const handleLoad = (event) => {
    setHasLoaded(true);
    setHasFailed(false);
    onLoad?.(event);
  };

  const handleError = (event) => {
    setHasFailed(true);
    onError?.(event);
  };

  return (
    <div className={cn('center relative h-full w-full overflow-hidden', wrapperClassName)}>
      {!hasLoaded && !hasFailed ? <Spinner className="opacity-50" size={16} /> : null}

      {mode === 'img' ? (
        <img
          ref={imageRef}
          src={resolvedSrc}
          alt={alt}
          className={imageClassName}
          onLoad={handleLoad}
          onError={handleError}
          {...props}
        />
      ) : (
        <Image
          ref={imageRef}
          src={resolvedSrc}
          alt={alt}
          fill={fill}
          className={imageClassName}
          onLoad={handleLoad}
          onError={handleError}
          {...props}
        />
      )}
    </div>
  );
}
