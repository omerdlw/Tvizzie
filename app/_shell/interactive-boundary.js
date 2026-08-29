'use client';

import { useEffect } from 'react';

import { composeProviders } from '@/app/_shell/compose-providers';
import { ACCOUNT_PROVIDER_CONFIG } from '@/domains/account/client/profile';
import GlobalContextMenuRegistry from '@/app/_shell/global-context-menu-registry';
import AccountNavRegistry from '@/app/_shell/navigation/account-nav-registry';

import { AccountProvider } from '@/modules/account';
import { ContextMenuGlobal, ContextMenuProvider } from '@/modules/context-menu';
import {
  createConsoleHandler,
  createSentryHandler,
  getErrorReporter,
} from '@/modules/error-boundary';
import { GlobalErrorListener } from '@/modules/error-boundary';
import { NotificationBadgeListener, NotificationListener } from '@/modules/notification';
import { getRealtimeTransportMode } from '@/infrastructure/realtime/client';

const InteractiveProviders = composeProviders(
  [AccountProvider, { config: ACCOUNT_PROVIDER_CONFIG }],
  [ContextMenuProvider],
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

function SharedInteractiveFrame({ children }) {
  return (
    <>
      <ObservabilityBootstrap />
      <NotificationListener />
      <GlobalErrorListener />
      {children}
    </>
  );
}

export function AuthInteractiveBoundary({ children }) {
  return <SharedInteractiveFrame>{children}</SharedInteractiveFrame>;
}

export function InteractiveFeatureBoundary({ children }) {
  return (
    <InteractiveProviders>
      <SharedInteractiveFrame>
        <AccountNavRegistry />
        <GlobalContextMenuRegistry />
        <NotificationBadgeListener />
        <ContextMenuGlobal />
        {children}
      </SharedInteractiveFrame>
    </InteractiveProviders>
  );
}
