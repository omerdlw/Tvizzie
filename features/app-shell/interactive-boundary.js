'use client';

import { useEffect } from 'react';

import { pipe } from '@/core/utils';
import { ACCOUNT_PROVIDER_CONFIG } from '@/core/services/account/account-client';
import GlobalContextMenuRegistry from '@/features/app-shell/global-context-menu-registry';
import NotificationsModal from '@/features/modals/notifications-modal';
import AccountNavRegistry from '@/features/navigation/account-nav-registry';
import { AccountProvider } from '@/core/modules/account';
import { AuthProvider, createSupabaseAuthAdapter } from '@/core/modules/auth';
import { ContextMenuGlobal, ContextMenuProvider } from '@/core/modules/context-menu';
import { CountdownOverlay, CountdownProvider } from '@/core/modules/countdown';
import { createConsoleHandler, createSentryHandler, getErrorReporter } from '@/core/modules/error-boundary';
import { GlobalErrorListener } from '@/core/modules/error-boundary/listener';
import { ModalProvider } from '@/core/modules/modal/context';
import { NotificationContainer } from '@/core/modules/notification';
import { NotificationProvider } from '@/core/modules/notification/context';
import { NotificationListener, NotificationBadgeListener } from '@/core/modules/notification/listener';
import { useRegistry } from '@/core/modules/registry';
import { SettingsProvider } from '@/core/modules/settings';
import { getRealtimeTransportMode } from '@/core/services/realtime/realtime-transport.config';

const APP_AUTH_CONFIG = {
  adapter: createSupabaseAuthAdapter({
    oauthDefaultNextPath: '/account',
  }),
  hydrateFromStorage: false,
  persistSession: false,
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
  [AccountProvider, { config: ACCOUNT_PROVIDER_CONFIG }],
  [NotificationProvider],
  [CountdownProvider, { config: { enabled: false } }],
  [ModalProvider],
  [ContextMenuProvider]
);

const AuthInteractiveProviders = pipe(
  [SettingsProvider, { config: APP_SETTINGS_CONFIG }],
  [AuthProvider, { config: APP_AUTH_CONFIG }],
  [NotificationProvider],
  [ModalProvider]
);

function resolveSentryGlobal() {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.Sentry || null;
}

function ObservabilityBootstrap() {
  useEffect(() => {
    const reporter = getErrorReporter({
      sampleRate: Number(process.env.NEXT_PUBLIC_ERROR_SAMPLE_RATE || 1),
    });

    if (!reporter.handlers.length) {
      reporter.addHandler(
        createConsoleHandler({
          level: 'error',
        })
      );

      const sentryGlobal = resolveSentryGlobal();

      if (sentryGlobal) {
        reporter.addHandler(createSentryHandler(sentryGlobal));
      }
    }

    reporter.setTag('runtime', 'web');
    reporter.setTag('transport', getRealtimeTransportMode());
  }, []);

  return null;
}

function GlobalNotificationModalRegistry() {
  useRegistry({
    modal: {
      NOTIFICATIONS_MODAL: NotificationsModal,
    },
  });

  return null;
}

function SharedInteractiveFrame({ children }) {
  return (
    <>
      <ObservabilityBootstrap />
      <NotificationContainer />
      <NotificationListener />
      <GlobalErrorListener />
      {children}
    </>
  );
}

export function AuthInteractiveBoundary({ children }) {
  return (
    <AuthInteractiveProviders>
      <SharedInteractiveFrame>{children}</SharedInteractiveFrame>
    </AuthInteractiveProviders>
  );
}

export function InteractiveFeatureBoundary({ children }) {
  return (
    <InteractiveProviders>
      <SharedInteractiveFrame>
        <AccountNavRegistry />
        <GlobalContextMenuRegistry />
        <GlobalNotificationModalRegistry />
        <NotificationBadgeListener />
        <ContextMenuGlobal />
        <CountdownOverlay />
        {children}
      </SharedInteractiveFrame>
    </InteractiveProviders>
  );
}
