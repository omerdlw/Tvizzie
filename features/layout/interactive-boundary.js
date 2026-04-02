'use client'

import { pipe } from '@/lib/utils/pipe'
import { ACCOUNT_CONFIG } from '@/config/account.config'
import { AUTH_CONFIG } from '@/config/auth.config'
import { isProjectFeatureEnabled } from '@/config/project.config'
import NotificationsModal from '@/features/modal/notifications-modal'
import AccountNavRegistry from '@/features/navigation/account-nav-registry'
import { AccountProvider } from '@/modules/account'
import { AuthProvider } from '@/modules/auth'
import { ContextMenuGlobal, ContextMenuProvider } from '@/modules/context-menu'
import { CountdownOverlay, CountdownProvider } from '@/modules/countdown'
import { GlobalErrorListener } from '@/modules/error-boundary/listener'
import { ModalProvider } from '@/modules/modal/context'
import { NotificationContainer } from '@/modules/notification'
import { NotificationProvider } from '@/modules/notification/context'
import {
  NotificationListener,
  NotificationBadgeListener,
} from '@/modules/notification/listener'
import { useRegistry } from '@/modules/registry'
import { SettingsProvider } from '@/modules/settings'

const APP_AUTH_CONFIG = {
  ...AUTH_CONFIG,
  enabled: isProjectFeatureEnabled('auth') && AUTH_CONFIG.enabled,
}

const APP_COUNTDOWN_CONFIG = {
  enabled: isProjectFeatureEnabled('countdown'),
}

const APP_SETTINGS_CONFIG = {
  storage: {
    localStorage: {
      legacyKeys: ['app_settings'],
    },
  },
}

const InteractiveProviders = pipe(
  [SettingsProvider, { config: APP_SETTINGS_CONFIG }],
  [AuthProvider, { config: APP_AUTH_CONFIG }],
  [AccountProvider, { config: ACCOUNT_CONFIG }],
  [NotificationProvider],
  [CountdownProvider, { config: APP_COUNTDOWN_CONFIG }],
  [ModalProvider],
  [ContextMenuProvider]
)

function GlobalNotificationModalRegistry() {
  useRegistry({
    modal: {
      NOTIFICATIONS_MODAL: NotificationsModal,
    },
  })

  return null
}

export function InteractiveFeatureBoundary({ children }) {
  return (
    <InteractiveProviders>
      <AccountNavRegistry />
      <GlobalNotificationModalRegistry />
      <NotificationContainer />
      <NotificationListener />
      <NotificationBadgeListener />
      <GlobalErrorListener />
      <ContextMenuGlobal />
      <CountdownOverlay />
      {children}
    </InteractiveProviders>
  )
}
