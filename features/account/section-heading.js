'use client'

import Link from 'next/link'

import Icon from '@/ui/icon'

export default function AccountSectionHeading({
  action = null,
  className = '',
  icon,
  showSeeMore = false,
  showDivider = true,
  summaryLabel = null,
  title,
  titleHref = null,
}) {
  const titleClassName =
    'text-xs font-semibold tracking-widest uppercase text-white/70 hover:text-white hover:underline hover:cursor-pointer transition'
  const summaryClassName =
    'text-xs font-semibold tracking-widest text-white/50 uppercase hover:text-white/70'

  return (
    <div className={`flex w-full flex-col gap-6 ${className}`}>
      <div className="flex w-full items-center justify-between gap-3">
        <div className="flex w-full flex-1 items-center gap-2">
          {icon ? <Icon icon={icon} size={24} /> : null}
          {titleHref ? (
            <Link href={titleHref} className={titleClassName}>
              {title}
            </Link>
          ) : (
            <h2 className={titleClassName}>
              {title}
            </h2>
          )}
        </div>
        <div className="flex shrink-0 items-center justify-end gap-3 text-right">
          {summaryLabel && titleHref ? (
            <Link href={titleHref} className={summaryClassName}>
              {summaryLabel}
            </Link>
          ) : summaryLabel ? (
            <p className={summaryClassName}>{summaryLabel}</p>
          ) : null}

          {action}
          {showSeeMore && titleHref ? (
            <Link
              href={titleHref}
              className={summaryClassName}>
              See more
            </Link>
          ) : null}
        </div>
      </div>

      {showDivider ? <div className="h-px bg-white/10" /> : null}
    </div>
  )
}
