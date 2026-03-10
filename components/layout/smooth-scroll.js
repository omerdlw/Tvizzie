'use client'

import { ReactLenis } from 'lenis/react'

export function SmoothScrollProvider({ children }) {
  return (
    <ReactLenis
      root
      options={{
        lerp: 0.2,
        duration: 1,
        smoothWheel: true,
        wheelMultiplier: 1,
        touchMultiplier: 2,
      }}
    >
      {children}
    </ReactLenis>
  )
}
