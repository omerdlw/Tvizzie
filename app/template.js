'use client'

import { useEffect } from 'react'

import { useBackgroundActions } from '@/modules/background/context'
import { ModuleError } from '@/modules/error-boundary'
import { Transition, TransitionWrapper } from '@/modules/transition'

export default function Template({ children }) {
  const { resetBackground } = useBackgroundActions()

  useEffect(() => {
    resetBackground()
  }, [resetBackground])

  return (
    <ModuleError>
      <TransitionWrapper>
        <Transition>{children}</Transition>
      </TransitionWrapper>
    </ModuleError>
  )
}
