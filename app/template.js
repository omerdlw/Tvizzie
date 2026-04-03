'use client'

import { useEffect } from 'react'

import { usePathname } from 'next/navigation'

import { useBackgroundActions } from '@/core/modules/background/context'
import { ModuleError } from '@/core/modules/error-boundary'
import { useNavHeight } from '@/core/modules/nav/hooks'
import { Transition, TransitionWrapper } from '@/core/modules/transition'

export default function Template({ children }) {
  const { resetBackground } = useBackgroundActions()
  const { navHeight } = useNavHeight()
  const pathname = usePathname()

  useEffect(() => {
    resetBackground()
  }, [resetBackground])

  return (
    <ModuleError>
      <div className="contents" key="template-root">
        <TransitionWrapper key="template-transition">
          <Transition key={pathname}>{children}</Transition>
        </TransitionWrapper>
        <div key="nav-spacer" style={{ height: navHeight, flexShrink: 0 }}></div>
      </div>
    </ModuleError>
  )
}
