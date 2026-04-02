'use client'

import { useCallback, useRef } from 'react'

import { cn } from '@/lib/utils'

const DRAG_THRESHOLD = 4

function defaultGetKey(item) {
  return item?.key
}

function defaultGetLabel(item) {
  return item?.label
}

export default function SegmentedControl({
  inactiveClassName = 'text-white/70 hover:text-white tracking-wide uppercase',
  activeClassName = 'bg-white/10 text-white tracking-wide font-semibold uppercase',
  getLabel = defaultGetLabel,
  getKey = defaultGetKey,
  getButtonClassName,
  buttonClassName,
  trackClassName,
  items = [],
  className,
  onChange,
  value,
  renderSuffix,
}) {
  const scrollRef = useRef(null)
  const isPointerDownRef = useRef(false)
  const isDraggingRef = useRef(false)
  const suppressClickRef = useRef(false)
  const startXRef = useRef(0)
  const startScrollLeftRef = useRef(0)

  const handleMouseDown = useCallback((event) => {
    const element = scrollRef.current
    if (!element) return

    isPointerDownRef.current = true
    isDraggingRef.current = false
    suppressClickRef.current = false
    startXRef.current = event.pageX - element.offsetLeft
    startScrollLeftRef.current = element.scrollLeft

    element.style.scrollBehavior = 'auto'
    element.style.cursor = 'grabbing'
  }, [])

  const handleMouseMove = useCallback((event) => {
    if (!isPointerDownRef.current) return

    const element = scrollRef.current
    if (!element) return

    const currentX = event.pageX - element.offsetLeft
    const delta = (currentX - startXRef.current) * 1.5

    if (Math.abs(delta) > DRAG_THRESHOLD) {
      isDraggingRef.current = true
      suppressClickRef.current = true
    }

    if (!isDraggingRef.current) return

    event.preventDefault()
    element.scrollLeft = startScrollLeftRef.current - delta
  }, [])

  const handleMouseUp = useCallback(() => {
    const element = scrollRef.current
    if (!element) return

    isPointerDownRef.current = false
    element.style.cursor = ''
    element.style.scrollBehavior = ''

    setTimeout(() => {
      isDraggingRef.current = false
    }, 0)
  }, [])

  const handleClickCapture = useCallback((event) => {
    if (!isDraggingRef.current && !suppressClickRef.current) return

    event.preventDefault()
    event.stopPropagation()
    suppressClickRef.current = false
  }, [])

  if (!Array.isArray(items) || items.length === 0) {
    return null
  }

  return (
    <div className={cn('flex items-center', className)}>
      <div
        ref={scrollRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClickCapture={handleClickCapture}
        onDragStart={(e) => e.preventDefault()}
        className={cn(
          'hide-scrollbar flex rounded-[12px] items-center gap-1 overflow-x-auto bg-white/5 border border-white/10 select-none p-0.5',
          trackClassName
        )}
      >
        {items.map((item) => {
          const itemKey = getKey(item)
          const isActive = value === itemKey

          return (
            <button
              key={itemKey}
              type="button"
              onClick={() => onChange?.(itemKey)}
              className={cn(
                'cursor-pointer py-1 rounded-[9px] px-3 whitespace-nowrap text-[11px]! font-medium transition-all duration-(--motion-duration-fast)',
                isActive ? activeClassName : inactiveClassName,
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
