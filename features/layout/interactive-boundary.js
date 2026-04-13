'use client';

import { pipe } from '@/core/utils/pipe';
import { ACCOUNT_CONFIG } from '@/config/account.config';
import { AUTH_CONFIG } from '@/config/auth.config';
import { isProjectFeatureEnabled } from '@/config/project.config';
import GlobalContextMenuRegistry from '@/features/layout/global-context-menu-registry';
import ObservabilityBootstrap from '@/features/layout/observability-bootstrap';
import NotificationsModal from '@/features/modal/notifications-modal';
import AccountNavRegistry from '@/features/navigation/account-nav-registry';
import AdminNavRegistry from '@/features/navigation/admin-nav-registry';
import { AccountProvider } from '@/core/modules/account';
import { AuthProvider } from '@/core/modules/auth';
import { ContextMenuGlobal, ContextMenuProvider } from '@/core/modules/context-menu';
import { CountdownOverlay, CountdownProvider } from '@/core/modules/countdown';
import { GlobalErrorListener } from '@/core/modules/error-boundary/listener';
import { ModalProvider } from '@/core/modules/modal/context';
import { NotificationContainer } from '@/core/modules/notification';
import { NotificationProvider } from '@/core/modules/notification/context';
import { NotificationListener, NotificationBadgeListener } from '@/core/modules/notification/listener';
import { useRegistry } from '@/core/modules/registry';
import { SettingsProvider } from '@/core/modules/settings';

const APP_AUTH_CONFIG = {
  ...AUTH_CONFIG,
  enabled: isProjectFeatureEnabled('auth') && AUTH_CONFIG.enabled,
};

const APP_COUNTDOWN_CONFIG = {
  enabled: isProjectFeatureEnabled('countdown'),
};

const APP_SETTINGS_CONFIG = {
  storage: {
    localStorage: {
      legacyKeys: ['app_settings'],
    },
  },
};

const InteractiveProviders = pipe(
  [SettingsProvider, { config: APP_SETTINGS_CONFIG }],
  [AuthProvider, { config: APP_AUTH_CONFIG }],
  [AccountProvider, { config: ACCOUNT_CONFIG }],
  [NotificationProvider],
  [CountdownProvider, { config: APP_COUNTDOWN_CONFIG }],
  [ModalProvider],
  [ContextMenuProvider]
);

function GlobalNotificationModalRegistry() {
  useRegistry({
    modal: {
      NOTIFICATIONS_MODAL: NotificationsModal,
    },
  });

  return null;
}

export function InteractiveFeatureBoundary({ children }) {
  return (
    <InteractiveProviders>
      <ObservabilityBootstrap />
      <AccountNavRegistry />
      <AdminNavRegistry />
      <GlobalContextMenuRegistry />
      <GlobalNotificationModalRegistry />
      <NotificationContainer />
      <NotificationListener />
      <NotificationBadgeListener />
      <GlobalErrorListener />
      <ContextMenuGlobal />
      <CountdownOverlay />
      {children}
    </InteractiveProviders>
  );
}
