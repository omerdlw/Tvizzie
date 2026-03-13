'use client'

import { useState } from 'react'

import Image from 'next/image'
import Link from 'next/link'

import { cn } from '@/lib/utils'
import Icon from '@/ui/icon'

const STYLES = Object.freeze({
  wrapper: 'group flex shrink-0 flex-col gap-2 backdrop-blur-sm',
  frame:
    'relative w-full overflow-hidden rounded-[20px] bg-white/5 p-1 ring ring-white/10 transition-all duration-[var(--motion-duration-normal)] group-hover:bg-white/10 group-hover:ring-white/15',
  inner: 'relative h-full w-full overflow-hidden rounded-[16px]',
  footer:
    'absolute right-0 -bottom-px left-0 bg-linear-to-t from-black/95 via-black/40 to-transparent p-3 pt-8',
  title: 'truncate text-xs font-bold',
})

function CardWrapper({ href, onClick, className, children }) {
  if (href) {
    return (
      <Link
        href={href}
        onDragStart={(event) => event.preventDefault()}
        className={className}
      >
        {children}
      </Link>
    )
  }

  const isClickable = typeof onClick === 'function'

  return (
    <div
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        isClickable
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                onClick()
              }
            }
          : undefined
      }
      onDragStart={(event) => event.preventDefault()}
      className={className}
    >
      {children}
    </div>
  )
}

export default function MediaCard({
  href,
  onClick,
  className,
  aspectClass = 'aspect-2/3',
  frameClassName,
  innerClassName,
  imageAlt,
  imageSrc,
  imageSizes = '(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw',
  imageClassName,
  fallbackIcon = 'solar:gallery-bold',
  fallbackIconClassName = 'text-white/50',
  fallbackIconSize = 20,
  topOverlay,
  title,
  titleClassName,
  footerClassName,
  meta,
  bottomContent,
}) {
  const [hasError, setHasError] = useState(false)
  const hasImage = Boolean(imageSrc) && !hasError

  return (
    <CardWrapper
      href={href}
      onClick={onClick}
      className={cn(STYLES.wrapper, className)}
    >
      <div className={cn(STYLES.frame, aspectClass, frameClassName)}>
        <div className={cn(STYLES.inner, innerClassName)}>
          {hasImage ? (
            <Image
              src={imageSrc}
              alt={imageAlt || title || 'Media'}
              fill
              draggable="false"
              sizes={imageSizes}
              onError={() => setHasError(true)}
              className={cn(
                'object-cover transition-transform duration-[var(--motion-duration-normal)] group-hover:scale-105',
                imageClassName
              )}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Icon
                icon={fallbackIcon}
                size={fallbackIconSize}
                className={fallbackIconClassName}
              />
            </div>
          )}

          {topOverlay}

          {(title || meta) && (
            <div className={cn(STYLES.footer, footerClassName)}>
              {title && (
                <p className={cn(STYLES.title, titleClassName)}>{title}</p>
              )}
              {meta && (
                <div className="mt-0.5 flex items-center gap-1.5">{meta}</div>
              )}
            </div>
          )}
        </div>
      </div>

      {bottomContent}
    </CardWrapper>
  )
}
