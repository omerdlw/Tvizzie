'use client'

import { useMemo } from 'react'

import { MotionConfig, useReducedMotion } from 'framer-motion'

import { SmoothScrollProvider } from '@/components/layout/smooth-scroll'
import ProfileBootstrapper from '@/components/profile/bootstrapper'
import { AUTH_CONFIG } from '@/config/auth.config'
import { NAV_CONFIG } from '@/config/nav.config'
import { PROJECT_CONFIG } from '@/config/project.config'
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
import { TransitionProvider } from '@/modules/transition'

const APP_AUTH_CONFIG = {
  ...AUTH_CONFIG,
  enabled: PROJECT_CONFIG.features.auth !== false && AUTH_CONFIG.enabled,
}

const ComposedProviders = pipe(
  [SettingsProvider],
  [FeaturesProvider, { config: PROJECT_CONFIG }],
  [AuthProvider, { config: APP_AUTH_CONFIG }],
  [RegistryProvider],
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
  const shouldReduceMotion = useReducedMotion()
  const prefersReducedMotion = useMemo(() => {
    if (
      typeof window === 'undefined' ||
      typeof window.matchMedia !== 'function'
    )
      return false
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }, [])

  return (
    <MotionConfig
      reducedMotion={
        shouldReduceMotion || prefersReducedMotion ? 'always' : 'never'
      }
    >
      <ComposedProviders>
        <ProfileBootstrapper />
        <NotificationContainer />
        <NotificationListener />
        <GlobalErrorListener />
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
