'use client';

import { forwardRef, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { cn } from '@/ui/class-names';
import { resolveImageFetchPriority, resolveImageLoading, resolveImageQuality } from '@/shared';
import AdaptiveImage from '@/ui/components/adaptive-image';
import Tooltip from '@/ui/primitives/tooltip';
import Icon from '@/ui/primitives/icon';

const CardWrapper = forwardRef(function CardWrapper(
  {
    href,
    onClick,
    className,
    children,
    onKeyDown,
    onPointerEnter,
    onPointerLeave,
    onTouchStart,
    onFocus,
    ...props
  },
  ref,
) {
  const router = useRouter();
  const prefetchTimerRef = useRef(null);
  const isClickable = typeof onClick === 'function';

  const handlePointerEnter = (event) => {
    onPointerEnter?.(event);
    if (!href || typeof href !== 'string' || !href.startsWith('/')) {
      return;
    }
    prefetchTimerRef.current = setTimeout(() => {
      router.prefetch(href);
    }, 65);
  };

  const handlePointerLeave = (event) => {
    onPointerLeave?.(event);
    if (prefetchTimerRef.current) {
      clearTimeout(prefetchTimerRef.current);
      prefetchTimerRef.current = null;
    }
  };

  const handleTouchStart = (event) => {
    onTouchStart?.(event);
    if (href && typeof href === 'string' && href.startsWith('/')) {
      router.prefetch(href);
    }
  };

  const handleFocus = (event) => {
    onFocus?.(event);
    if (href && typeof href === 'string' && href.startsWith('/')) {
      router.prefetch(href);
    }
  };

  const handleClick = (event) => {
    const interactive = event.target.closest('button, a, input, select, textarea, [role="button"]');
    if (interactive && interactive !== event.currentTarget) {
      return;
    }
    onClick?.(event);
  };

  const handleKeyDown = (event) => {
    onKeyDown?.(event);
    const interactive = event.target.closest('button, a, input, select, textarea, [role="button"]');
    if (interactive && interactive !== event.currentTarget) {
      return;
    }
    if (!isClickable) {
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClick(event);
    }
  };

  if (href) {
    return (
      <Link
        ref={ref}
        href={href}
        onClick={handleClick}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        onTouchStart={handleTouchStart}
        onFocus={handleFocus}
        onDragStart={(event) => event.preventDefault()}
        className={className}
        {...props}
      >
        {children}
      </Link>
    );
  }
  return (
    <div
      ref={ref}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onDragStart={(event) => event.preventDefault()}
      className={className}
      {...props}
    >
      {children}
    </div>
  );
});

export default function MediaCard({
  href,
  onClick,
  onContextMenu,
  className,
  aspectClass = 'aspect-2/3',
  frameClassName,
  innerClassName,
  footer,
  imageAlt,
  imageSrc,
  imageSizes = '(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw',
  imagePreset = 'grid',
  imageLoading,
  imagePriority = false,
  imageFetchPriority,
  imageQuality,
  onImageError,
  imageClassName,
  imageBaseClassName = 'object-cover',
  fallbackIcon = 'solar:gallery-bold',
  fallbackIconClassName = '',
  fallbackIconSize = 20,
  fallbackContent,
  overlay,
  topOverlay,
  tooltipText,
  title,
  ...props
}) {
  const [hasError, setHasError] = useState(false);
  const hasImage = Boolean(imageSrc) && !hasError;
  const resolvedTooltipText = String(tooltipText || '').trim();
  const resolvedImageLoading = resolveImageLoading({
    loading: imageLoading,
    priority: imagePriority,
  });
  const resolvedImageFetchPriority = resolveImageFetchPriority({
    fetchPriority: imageFetchPriority,
    priority: imagePriority,
  });
  const resolvedImageQuality = resolveImageQuality(imagePreset, imageQuality);

  const cardNode = (
    <div
      className="group relative h-full w-full overflow-hidden rounded-[20px]"
      suppressHydrationWarning
    >
      <CardWrapper
        href={href}
        onClick={onClick}
        onContextMenu={onContextMenu}
        className={cn(
          'isolate flex h-full w-full shrink-0 transform-gpu flex-col overflow-hidden rounded-[20px]',
          className,
        )}
        {...props}
      >
        <div
          className={cn(
            'relative w-full overflow-hidden rounded-[20px]',
            aspectClass,
            frameClassName,
          )}
        >
          <div
            className={cn('relative h-full w-full overflow-hidden rounded-[20px]', innerClassName)}
          >
            {hasImage ? (
              <AdaptiveImage
                src={imageSrc}
                alt={imageAlt || title || 'Media'}
                fill
                sizes={imageSizes}
                loading={resolvedImageLoading}
                fetchPriority={resolvedImageFetchPriority}
                quality={resolvedImageQuality}
                decoding="async"
                onError={() => {
                  setHasError(true);
                  onImageError?.();
                }}
                className={cn('rounded-[20px]', imageBaseClassName, imageClassName)}
                wrapperClassName="h-full w-full rounded-[20px]"
                draggable="false"
              />
            ) : (
              fallbackContent || (
                <div className="center h-full w-full rounded-[20px] bg-white/5 ring-1 ring-white/5 ring-inset">
                  <Icon
                    icon={fallbackIcon}
                    size={fallbackIconSize}
                    className={fallbackIconClassName}
                  />
                </div>
              )
            )}
          </div>
        </div>
      </CardWrapper>
      {overlay}
      {topOverlay && (
        <div className="pointer-events-auto absolute top-2 right-2 z-20 transition-all duration-200">
          {topOverlay}
        </div>
      )}
    </div>
  );
  const cardWithTooltip = resolvedTooltipText ? (
    <Tooltip text={resolvedTooltipText} position="top">
      {cardNode}
    </Tooltip>
  ) : (
    cardNode
  );
  if (!footer) {
    return cardWithTooltip;
  }
  return (
    <div className="flex h-full w-full flex-col justify-between">
      {cardWithTooltip}
      {footer}
    </div>
  );
}
