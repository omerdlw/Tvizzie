'use client'

import { forwardRef, useState } from 'react'

import Image from 'next/image'
import Link from 'next/link'

import { cn, getImagePlaceholderDataUrl } from '@/lib/utils'
import Tooltip from '@/ui/elements/tooltip'
import Icon from '@/ui/icon'

const CardWrapper = forwardRef(function CardWrapper(
  { href, onClick, className, children, onKeyDown, ...props },
  ref
) {
  const isClickable = typeof onClick === 'function'

  const handleClick = (event) => onClick?.(event)

  const handleKeyDown = (event) => {
    onKeyDown?.(event)

    if (!isClickable) {
      return
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onClick(event)
    }
  }

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
    )
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
  )
})

export default function MediaCard({
  href,
  onClick,
  className,
  aspectClass = 'aspect-2/3',
  frameClassName,
  innerClassName,
  footer,
  imageAlt,
  imageSrc,
  imageSizes = '(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw',
  imageLoading,
  imagePriority = false,
  imageFetchPriority,
  imageQuality = 82,
  onImageError,
  imageClassName,
  imageBaseClassName = 'object-cover transition-transform duration-(--motion-duration-normal) hover:scale-105',
  fallbackIcon = 'solar:gallery-bold',
  fallbackIconClassName = 'text-white/50',
  fallbackIconSize = 20,
  fallbackContent,
  overlay,
  topOverlay,
  tooltipText,
  title,
}) {
  const [hasError, setHasError] = useState(false)
  const hasImage = Boolean(imageSrc) && !hasError
  const resolvedTooltipText = String(tooltipText || '').trim()

  const cardNode = (
    <CardWrapper
      href={href}
      onClick={onClick}
      className={cn('group flex shrink-0 flex-col bg-white/5 border border-white/5 hover:border-white/20 rounded-[14px] overflow-hidden', className)}
    >
      <div
        className={cn(
          'relative w-full overflow-hidden',
          aspectClass,
          frameClassName
        )}
      >
        <div
          className={cn('relative h-full w-full overflow-hidden', innerClassName)}
        >
          {hasImage ? (
            <Image
              src={imageSrc}
              alt={imageAlt || title || 'Media'}
              fill
              draggable="false"
              sizes={imageSizes}
              loading={imageLoading}
              priority={imagePriority}
              fetchPriority={imageFetchPriority}
              quality={imageQuality}
              placeholder="blur"
              blurDataURL={getImagePlaceholderDataUrl(
                imageSrc || imageAlt || title
              )}
              onError={() => {
                setHasError(true)
                onImageError?.()
              }}
              className={cn(imageBaseClassName, imageClassName)}
            />
          ) : (
            fallbackContent || (
              <div className="center h-full w-full">
                <Icon
                  icon={fallbackIcon}
                  size={fallbackIconSize}
                  className={fallbackIconClassName}
                />
              </div>
            )
          )}
          {overlay || topOverlay}
        </div>
      </div>

      {footer}
    </CardWrapper>
  )

  if (!resolvedTooltipText) {
    return cardNode
  }

  return (
    <Tooltip
      text={resolvedTooltipText}
      position="top"
      delayMs={40}
    >
      {cardNode}
    </Tooltip>
  )
}
