'use client'

import { useMemo } from 'react'

import { MotionConfig, useReducedMotion } from 'framer-motion'

import ProfileBootstrapper from '@/components/profile/profile-bootstrapper'
import { SmoothScrollProvider } from '@/components/layout/smooth-scroll'
import { AUTH_CONFIG } from '@/config/auth.config'
import { NAV_CONFIG } from '@/config/nav.config'
import { PROJECT_CONFIG } from '@/config/project.config'
import { SettingsProvider } from '@/contexts/settings-context'
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
      <SettingsProvider>
        <FeaturesProvider config={PROJECT_CONFIG}>
          <AuthProvider config={APP_AUTH_CONFIG}>
            <ProfileBootstrapper />
            <RegistryProvider>
              <NotificationProvider>
                <TransitionProvider>
                  <BackgroundProvider>
                    <NavigationProvider config={NAV_CONFIG}>
                      <ControlsProvider>
                        <LoadingProvider>
                          <CountdownProvider>
                            <ModalProvider>
                              <ContextMenuProvider>
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
                              </ContextMenuProvider>
                            </ModalProvider>
                          </CountdownProvider>
                        </LoadingProvider>
                      </ControlsProvider>
                    </NavigationProvider>
                  </BackgroundProvider>
                </TransitionProvider>
              </NotificationProvider>
            </RegistryProvider>
          </AuthProvider>
        </FeaturesProvider>
      </SettingsProvider>
    </MotionConfig>
  )
}
