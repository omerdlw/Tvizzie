'use client'

import { useEffect, useRef } from 'react'

export function useDraggableScroll() {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    let isDown = false
    let startX
    let scrollLeft
    let isDragging = false

    const handleMouseDown = (e) => {
      isDown = true
      isDragging = false
      el.classList.add('cursor-grabbing')
      el.classList.remove('cursor-pointer')
      startX = e.pageX - el.offsetLeft
      scrollLeft = el.scrollLeft

      el.style.scrollBehavior = 'auto'
    }

    const handleMouseLeave = () => {
      isDown = false
      el.classList.remove('cursor-grabbing')
      el.style.scrollBehavior = ''
    }

    const handleMouseUp = () => {
      isDown = false
      el.classList.remove('cursor-grabbing')
      el.style.scrollBehavior = ''

      setTimeout(() => {
        isDragging = false
      }, 0)
    }

    const handleMouseMove = (e) => {
      if (!isDown) return

      const x = e.pageX - el.offsetLeft
      const walk = (x - startX) * 2

      if (Math.abs(walk) > 5) {
        isDragging = true
      }

      if (isDragging) {
        e.preventDefault()
        el.scrollLeft = scrollLeft - walk
      }
    }

    const handleBlur = (e) => {
      if (isDragging) {
        e.preventDefault()
        e.stopPropagation()
      }
    }

    el.addEventListener('mousedown', handleMouseDown)
    el.addEventListener('mouseleave', handleMouseLeave)
    el.addEventListener('mouseup', handleMouseUp)
    el.addEventListener('mousemove', handleMouseMove)
    el.addEventListener('click', handleBlur, true)

    return () => {
      el.removeEventListener('mousedown', handleMouseDown)
      el.removeEventListener('mouseleave', handleMouseLeave)
      el.removeEventListener('mouseup', handleMouseUp)
      el.removeEventListener('mousemove', handleMouseMove)
      el.removeEventListener('click', handleBlur, true)
    }
  }, [])

  return ref
}
