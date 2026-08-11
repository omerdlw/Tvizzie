'use client';

import { useEffect } from 'react';

import { pipe } from '@/shared/utils';
import { ACCOUNT_PROVIDER_CONFIG } from '@/domains/account/client';
import GlobalContextMenuRegistry from '@/app/_shell/global-context-menu-registry';
import NotificationsModal from '@/domains/social/ui/modals/notifications-modal';
import AccountNavRegistry from '@/app/_shell/navigation/account-nav-registry';
import { AccountProvider } from '@/modules/account';
import { ContextMenuGlobal, ContextMenuProvider } from '@/modules/context-menu';
import {
  createConsoleHandler,
  createSentryHandler,
  getErrorReporter,
} from '@/modules/error-boundary';
import { GlobalErrorListener } from '@/modules/error-boundary/listener';
import { NotificationContainer } from '@/modules/notification';
import { NotificationProvider } from '@/modules/notification/context';
import { NotificationBadgeListener, NotificationListener } from '@/modules/notification';
import { useRegistry } from '@/modules/registry';
import { getRealtimeTransportMode } from '@/infrastructure/realtime/realtime-transport-config';

const InteractiveProviders = pipe(
  [AccountProvider, { config: ACCOUNT_PROVIDER_CONFIG }],
  [NotificationProvider],
  [ContextMenuProvider],
);

const AuthInteractiveProviders = pipe([NotificationProvider]);

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
        {children}
      </SharedInteractiveFrame>
    </InteractiveProviders>
  );
}
