'use client';

import { forwardRef, useState } from 'react';

import Link from 'next/link';

import {
  cn,
  getImagePlaceholderDataUrl,
  resolveImageFetchPriority,
  resolveImageLoading,
  resolveImageQuality,
} from '@/core/utils';
import AdaptiveImage from '@/ui/elements/adaptive-image';
import Tooltip from '@/ui/elements/tooltip';
import Icon from '@/ui/icon';

const CardWrapper = forwardRef(function CardWrapper({ href, onClick, className, children, onKeyDown, ...props }, ref) {
  const isClickable = typeof onClick === 'function';

  const handleClick = (event) => onClick?.(event);

  const handleKeyDown = (event) => {
    onKeyDown?.(event);

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
  imageBaseClassName = 'object-cover transition-transform duration-[300ms] ',
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
  const resolvedImageLoading = resolveImageLoading({ loading: imageLoading, priority: imagePriority });
  const resolvedImageFetchPriority = resolveImageFetchPriority({
    fetchPriority: imageFetchPriority,
    priority: imagePriority,
  });
  const resolvedImageQuality = resolveImageQuality(imagePreset, imageQuality);

  const cardNode = (
    <CardWrapper
      href={href}
      onClick={onClick}
      onContextMenu={onContextMenu}
      className={cn('group flex shrink-0 flex-col overflow-hidden rounded-[14px] transition ease-in-out', className)}
      {...props}
    >
      <div className={cn('relative w-full overflow-hidden', aspectClass, frameClassName)}>
        <div className={cn('relative h-full w-full overflow-hidden', innerClassName)}>
          {hasImage ? (
            <AdaptiveImage
              src={imageSrc}
              alt={imageAlt || title || 'Media'}
              fill
              sizes={imageSizes}
              loading={resolvedImageLoading}
              priority={imagePriority}
              fetchPriority={resolvedImageFetchPriority}
              quality={resolvedImageQuality}
              decoding="async"
              placeholder="blur"
              blurDataURL={getImagePlaceholderDataUrl(imageSrc || imageAlt || title)}
              onError={() => {
                setHasError(true);
                onImageError?.();
              }}
              className={cn(imageBaseClassName, imageClassName)}
              wrapperClassName="h-full w-full"
              draggable="false"
            />
          ) : (
            fallbackContent || (
              <div className="center h-full w-full border border-black/5 bg-black/5">
                <Icon icon={fallbackIcon} size={fallbackIconSize} className={fallbackIconClassName} />
              </div>
            )
          )}
          {overlay || topOverlay}
        </div>
      </div>
    </CardWrapper>
  );

  const cardWithTooltip = resolvedTooltipText ? (
    <Tooltip text={resolvedTooltipText} position="top" delayMs={40}>
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
