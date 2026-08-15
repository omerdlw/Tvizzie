'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { cn } from '@/shared/utils';

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
  priority = false,
  preload = false,
  loading,
  fetchPriority,
  onLoad,
  onError,
  decoding = 'async',
  ...props
}) {
  const imageRef = useRef(null);
  const resolvedSrc = getSafeSrc(src);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [hasFailed, setHasFailed] = useState(false);

  useEffect(() => {
    // Check if the image is already cached by the browser
    const imageElement = imageRef.current;
    if (imageElement && imageElement.complete && imageElement.naturalWidth > 0) {
      setHasLoaded(true);
      setHasFailed(false);
    } else {
      setHasLoaded(false);
      setHasFailed(false);
    }
  }, [resolvedSrc]);

  if (!resolvedSrc) {
    return null;
  }

  const imageClassName = cn(
    fill ? 'absolute inset-0 h-full w-full' : 'h-full w-full',
    'transition-opacity duration-200 ease-out',
    hasLoaded ? 'opacity-100' : 'opacity-0',
    className,
  );

  const resolvedLoading = loading || (priority ? 'eager' : 'lazy');
  const resolvedFetchPriority = fetchPriority || (priority ? 'high' : undefined);

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
    <div
      className={cn(
        'relative h-full w-full overflow-hidden bg-white/5',
        skeletonClassName,
        wrapperClassName,
      )}
    >
      {mode === 'img' ? (
        <img
          ref={imageRef}
          src={resolvedSrc}
          alt={alt}
          className={imageClassName}
          onLoad={handleLoad}
          onError={handleError}
          loading={resolvedLoading}
          fetchPriority={resolvedFetchPriority}
          decoding={decoding}
          {...props}
        />
      ) : (
        <Image
          ref={imageRef}
          src={resolvedSrc}
          alt={alt}
          fill={fill}
          preload={preload}
          loading={resolvedLoading}
          fetchPriority={resolvedFetchPriority}
          decoding={decoding}
          className={imageClassName}
          onLoad={handleLoad}
          onError={handleError}
          {...props}
        />
      )}
    </div>
  );
}
