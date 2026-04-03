'use client'

import { useCallback, useEffect, useState } from 'react'

export function useScrollToTop(threshold = 100) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleScroll = () => {
      setVisible(window.scrollY > threshold)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()

    return () => {
      window.removeEventListener('scroll', handleScroll)
    }
  }, [threshold])

  const scrollToTop = useCallback(() => {
    if (typeof window === 'undefined') return

    window.scrollTo({
      behavior: 'smooth',
      top: 0,
    })
  }, [])

  return { visible, scrollToTop }
}
