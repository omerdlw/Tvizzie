'use client'

import { cn } from '@/lib/utils'

const STYLES = Object.freeze({
  track:
    'hide-scrollbar flex items-center gap-1 overflow-x-auto bg-white/5 ring-1 ring-white/10',
  active: 'bg-white/15 text-white',
  inactive: 'text-white/50 hover:text-white/70',
  size: Object.freeze({
    md: Object.freeze({
      track: 'rounded-[12px] p-0.5',
      button: 'rounded-[10px] px-3',
      text: 'text-xs font-medium',
    }),
    sm: Object.freeze({
      track: 'rounded-[12px] p-0.5',
      button: 'rounded-[10px] px-3 py-1',
      text: 'text-[11px] font-medium',
    }),
  }),
})

export default function SegmentedControl({
  items = [],
  value,
  onChange,
  className,
  trackClassName,
  buttonClassName,
  getButtonClassName,
  activeClassName = STYLES.active,
  inactiveClassName = STYLES.inactive,
  size = 'md',
  getKey = (item) => item?.key,
  getLabel = (item) => item?.label,
  renderSuffix,
}) {
  const sizeStyle = STYLES.size[size] || STYLES.size.md

  if (!Array.isArray(items) || items.length === 0) {
    return null
  }

  return (
    <div className={cn('flex items-center', className)}>
      <div className={cn(STYLES.track, sizeStyle.track, trackClassName)}>
        {items.map((item) => {
          const key = getKey(item)
          const isActive = value === key

          return (
            <button
              type="button"
              key={key}
              onClick={() => onChange?.(key)}
              className={cn(
                'cursor-pointer whitespace-nowrap transition-all duration-[var(--motion-duration-fast)]',
                sizeStyle.button,
                sizeStyle.text,
                isActive
                  ? activeClassName || STYLES.active
                  : inactiveClassName || STYLES.inactive,
                buttonClassName,
                typeof getButtonClassName === 'function'
                  ? getButtonClassName(item, isActive)
                  : null
              )}
            >
              {getLabel(item)}
              {typeof renderSuffix === 'function' ? renderSuffix(item) : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}
