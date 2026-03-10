'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import Icon from '@/ui/icon'

const SCROLL_STEP = 2
const SCROLL_THRESHOLD = 4

export default function Carousel({ children, className = '', gap = 'gap-2' }) {
  const scrollRef = useRef(null)
  const isDraggingRef = useRef(false)
  const startXRef = useRef(0)
  const scrollLeftRef = useRef(0)
  const isDownRef = useRef(false)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > SCROLL_THRESHOLD)
    setCanScrollRight(
      el.scrollLeft + el.clientWidth < el.scrollWidth - SCROLL_THRESHOLD
    )
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    updateScrollState()
    const observer = new ResizeObserver(updateScrollState)
    observer.observe(el)
    return () => observer.disconnect()
  }, [updateScrollState, children])

  const scroll = useCallback((direction) => {
    const el = scrollRef.current
    if (!el) return
    const cardWidth = el.firstElementChild?.offsetWidth || 288
    const amount = cardWidth * SCROLL_STEP * direction
    el.scrollBy({ left: amount, behavior: 'smooth' })
  }, [])

  const handleScroll = useCallback(() => {
    updateScrollState()
  }, [updateScrollState])

  const handleMouseDown = useCallback((e) => {
    const el = scrollRef.current
    if (!el) return
    isDownRef.current = true
    isDraggingRef.current = false
    startXRef.current = e.pageX - el.offsetLeft
    scrollLeftRef.current = el.scrollLeft
    el.style.scrollBehavior = 'auto'
    el.style.cursor = 'grabbing'
  }, [])

  const handleMouseMove = useCallback((e) => {
    if (!isDownRef.current) return
    const el = scrollRef.current
    if (!el) return
    const x = e.pageX - el.offsetLeft
    const walk = (x - startXRef.current) * 1.5
    if (Math.abs(walk) > 4) isDraggingRef.current = true
    if (isDraggingRef.current) {
      e.preventDefault()
      el.scrollLeft = scrollLeftRef.current - walk
    }
  }, [])

  const handleMouseUp = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    isDownRef.current = false
    el.style.cursor = ''
    el.style.scrollBehavior = ''
    setTimeout(() => {
      isDraggingRef.current = false
    }, 0)
  }, [])

  const handleClick = useCallback((e) => {
    if (isDraggingRef.current) {
      e.preventDefault()
      e.stopPropagation()
    }
  }, [])

  return (
    <div className="group/carousel relative -m-1">
      <div
        ref={scrollRef}
        className={`flex ${gap} scrollbar-hide overflow-x-auto rounded-[20px] p-1 ${className}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDragStart={(e) => e.preventDefault()}
        onClick={handleClick}
        onScroll={handleScroll}
        style={{ userSelect: 'none' }}
      >
        {children}
      </div>

      {canScrollLeft && (
        <button
          onClick={() => scroll(-1)}
          aria-label="Scroll left"
          className="absolute top-1/2 -left-4 z-10 flex h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-[14px] border border-white/10 bg-black/40 text-white backdrop-blur-sm transition-opacity duration-200 hover:bg-black/80 hover:ring-white/40"
        >
          <Icon icon="solar:alt-arrow-left-bold" size={16} />
        </button>
      )}

      {canScrollRight && (
        <button
          onClick={() => scroll(1)}
          aria-label="Scroll right"
          className="absolute top-1/2 -right-4 z-10 flex h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-[14px] border border-white/10 bg-black/40 text-white backdrop-blur-sm transition-opacity duration-200 hover:bg-black/80 hover:ring-white/40"
        >
          <Icon icon="solar:alt-arrow-right-bold" size={16} />
        </button>
      )}
    </div>
  )
}
