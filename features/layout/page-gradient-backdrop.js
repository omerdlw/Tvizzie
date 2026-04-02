'use client'

import { cn } from '@/lib/utils'
import { useNavHeight } from '@/modules/nav/hooks'

export const PAGE_GRADIENT_BACKDROP_CLASS =
  'pointer-events-none absolute inset-0 z-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.06)_0%,rgba(0,0,0,0.14)_20vh,rgba(0,0,0,0.38)_42vh,rgba(0,0,0,0.78)_58vh,#0A0A0A_70vh,#0A0A0A_100%)]'

export function PageGradientShell({ children, className, contentClassName }) {
  const { navHeight } = useNavHeight()
  const backdropExtension = Math.max(0, Math.round(navHeight || 0))

  return (
    <div className={cn('relative min-h-dvh w-full', className)}>
      <div
        className={PAGE_GRADIENT_BACKDROP_CLASS}
        style={{ bottom: -backdropExtension }}
      />
      <div className={cn('relative z-10', contentClassName)}>{children}</div>
    </div>
  )
}
