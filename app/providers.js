'use client'

import { useEffect, useMemo, useState } from 'react'

import { MotionConfig, useReducedMotion } from 'framer-motion'

import { SmoothScrollProvider } from '@/components/layout/smooth-scroll'
import { AUTH_CONFIG } from '@/config/auth.config'
import { NAV_CONFIG } from '@/config/nav.config'
import {
  PROJECT_CONFIG,
  isProjectFeatureEnabled,
  isRegistryDebugPanelEnabled,
  isRegistryHistoryCaptureEnabled,
} from '@/config/project.config'
import { SettingsProvider } from '@/contexts/settings-context'
import { pipe } from '@/lib/utils/pipe'
import { AuthProvider } from '@/modules/auth'
import { BackgroundOverlay, BackgroundProvider } from '@/modules/background'
import { ContextMenuGlobal, ContextMenuProvider } from '@/modules/context-menu'
import { ControlsProvider } from '@/modules/controls/context'
import { CountdownOverlay, CountdownProvider } from '@/modules/countdown'
import { GlobalError } from '@/modules/error-boundary'
import { GlobalErrorListener } from '@/modules/error-boundary/listener'
import { FeaturesProvider } from '@/modules/features'
import { LoadingOverlay, LoadingProvider } from '@/modules/loading'
import { ModalProvider } from '@/modules/modal/context'
import { NavigationProvider } from '@/modules/nav/context'
import { NotificationContainer } from '@/modules/notification'
import { NotificationProvider } from '@/modules/notification/context'
import { NotificationListener } from '@/modules/notification/listener'
import { RegistryProvider } from '@/modules/registry/context'
import { RegistryDebugPanel } from '@/modules/registry/debug-panel'
import { TransitionProvider } from '@/modules/transition'

const APP_AUTH_CONFIG = {
  ...AUTH_CONFIG,
  enabled: isProjectFeatureEnabled('auth') && AUTH_CONFIG.enabled,
}

const ComposedProviders = pipe(
  [SettingsProvider],
  [FeaturesProvider, { config: PROJECT_CONFIG }],
  [AuthProvider, { config: APP_AUTH_CONFIG }],
  [RegistryProvider, { enableHistory: isRegistryHistoryCaptureEnabled() }],
  [NotificationProvider],
  [TransitionProvider],
  [BackgroundProvider],
  [NavigationProvider, { config: NAV_CONFIG }],
  [ControlsProvider],
  [LoadingProvider],
  [CountdownProvider],
  [ModalProvider],
  [ContextMenuProvider]
)

export const AppProviders = ({ children }) => {
  const [isHydrated, setIsHydrated] = useState(false)
  const showRegistryDebugPanel = isRegistryDebugPanelEnabled()
  const shouldReduceMotion = useReducedMotion()
  const prefersReducedMotion = useMemo(() => {
    if (
      typeof window === 'undefined' ||
      typeof window.matchMedia !== 'function'
    )
      return false
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }, [])

  useEffect(() => {
    setIsHydrated(true)
  }, [])

  return (
    <MotionConfig
      reducedMotion={
        shouldReduceMotion || prefersReducedMotion ? 'always' : 'never'
      }
    >
      <ComposedProviders>
        <NotificationContainer />
        <NotificationListener />
        <GlobalErrorListener />
        {isHydrated && showRegistryDebugPanel && <RegistryDebugPanel />}
        <ContextMenuGlobal />
        <BackgroundOverlay />
        <CountdownOverlay />
        <LoadingOverlay />
        <SmoothScrollProvider>
          <GlobalError>{children}</GlobalError>
        </SmoothScrollProvider>
      </ComposedProviders>
    </MotionConfig>
  )
}
