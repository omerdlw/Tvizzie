'use client';

import { useEffect } from 'react';

import { pipe } from '@/shared/utils';
import { ACCOUNT_PROVIDER_CONFIG } from '@/domains/account/client';
import GlobalContextMenuRegistry from '@/app/_shell/global-context-menu-registry';
import NotificationsModal from '@/domains/social/ui/modals/notifications-modal';
import AccountNavRegistry from '@/app/_shell/navigation/account-nav-registry';
import { AccountProvider } from '@/modules/account';
import { AuthProvider, createSupabaseAuthAdapter } from '@/modules/auth';
import { ContextMenuGlobal, ContextMenuProvider } from '@/modules/context-menu';
import { CountdownOverlay, CountdownProvider } from '@/modules/countdown';
import {
  createConsoleHandler,
  createSentryHandler,
  getErrorReporter,
} from '@/modules/error-boundary';
import { GlobalErrorListener } from '@/modules/error-boundary/listener';
import { ModalProvider } from '@/modules/modal';
import { NotificationContainer } from '@/modules/notification';
import { NotificationProvider } from '@/modules/notification/context';
import { NotificationBadgeListener, NotificationListener } from '@/modules/notification';
import { useRegistry } from '@/modules/registry';
import { SettingsProvider } from '@/modules/settings';
import { getRealtimeTransportMode } from '@/infrastructure/realtime/realtime-transport-config';
import {
  createClient as createSupabaseClient,
  terminateBrowserSession,
} from '@/infrastructure/supabase/supabase-client';

const APP_AUTH_CONFIG = {
  adapter: createSupabaseAuthAdapter({
    client: () => createSupabaseClient(),
    oauthDefaultNextPath: '/account',
    terminateBrowserSession,
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
  [ContextMenuProvider],
);

const AuthInteractiveProviders = pipe(
  [SettingsProvider, { config: APP_SETTINGS_CONFIG }],
  [AuthProvider, { config: APP_AUTH_CONFIG }],
  [NotificationProvider],
  [ModalProvider],
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
        }),
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

export function PersistentInteractiveShell({ children }) {
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
