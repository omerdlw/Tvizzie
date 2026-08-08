'use client';

import { useEffect } from 'react';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { useReportWebVitals } from 'next/web-vitals';

import {
  AuthInteractiveBoundary,
  InteractiveFeatureBoundary,
  PersistentInteractiveShell,
} from '@/app/_shell/interactive-boundary';
import { NAV_RUNTIME } from '@/app/_shell/nav-runtime';
import SettingsModal from '@/app/_shell/settings-modal';
import { NAV_CONFIG } from '@/app/_shell/navigation-config';
import { pipe } from '@/shared/utils';
import { SmoothScrollProvider } from '@/app/_shell/smooth-scroll';

import { BackgroundOverlay, BackgroundProvider } from '@/modules/background';
import { GlobalError } from '@/modules/error-boundary';
import { LoadingOverlay, LoadingProvider } from '@/modules/loading';
import { NavigationProvider } from '@/modules/nav/context';
import {
  RegistryBootstrap,
  REGISTRY_TYPES,
  RegistryProvider,
  useNavRegistryActions,
} from '@/modules/registry';

const Nav = dynamic(() => import('@/modules/nav'));
const WEB_VITALS_ENDPOINT = '/api/observability/web-vitals';
const TRACKED_METRICS = new Set(['CLS', 'FCP', 'INP', 'LCP', 'TTFB']);
const STATIC_NAV_ITEMS = Object.freeze(
  Object.fromEntries(Object.values(NAV_CONFIG.items).map((item) => [item.path || item.name, item])),
);

const APP_REGISTRY_ENTRIES = Object.freeze([
  {
    type: REGISTRY_TYPES.NAV,
    items: STATIC_NAV_ITEMS,
  },
  {
    type: REGISTRY_TYPES.MODAL,
    items: {
      SETTINGS_MODAL: SettingsModal,
    },
  },
  {
    type: REGISTRY_TYPES.NAV_RUNTIME,
    items: {
      default: {
        ...NAV_RUNTIME,
        integrations: NAV_CONFIG.integrations,
      },
    },
  },
]);

function AppRegistryBootstrap({ children }) {
  return (
    <>
      <RegistryBootstrap entries={APP_REGISTRY_ENTRIES} />
      {children}
    </>
  );
}

const CoreShellProviders = pipe(
  [RegistryProvider, { enableHistory: false }],
  [AppRegistryBootstrap],
  [BackgroundProvider],
  [NavigationProvider],
  [LoadingProvider],
);

function shouldEnableInteractiveBoundary(pathname = '/') {
  return resolveInteractiveBoundaryVariant(pathname) !== 'none';
}

function resolveInteractiveBoundaryVariant(pathname = '/') {
  return pathname === '/' ||
    pathname.startsWith('/movie/') ||
    pathname.startsWith('/tv/') ||
    pathname.startsWith('/person/') ||
    pathname.startsWith('/account') ||
    pathname.startsWith('/modules')
    ? 'full'
    : pathname.startsWith('/sign-in') || pathname.startsWith('/sign-up')
      ? 'auth'
      : 'none';
}

function renderInteractiveBoundary(children, variant) {
  if (variant === 'full') {
    return <InteractiveFeatureBoundary>{children}</InteractiveFeatureBoundary>;
  }

  if (variant === 'auth') {
    return <AuthInteractiveBoundary>{children}</AuthInteractiveBoundary>;
  }

  return children;
}

function shouldEnableSmoothScroll(pathname = '/') {
  return resolveInteractiveBoundaryVariant(pathname) === 'full';
}

function sanitizeMetric(metric) {
  return {
    delta: Number(metric?.delta) || 0,
    id: String(metric?.id || '').slice(0, 120),
    name: String(metric?.name || '').slice(0, 40),
    navigationType: String(metric?.navigationType || '').slice(0, 40) || 'navigate',
    pathname: typeof window === 'undefined' ? null : window.location.pathname,
    rating: String(metric?.rating || '').slice(0, 40) || 'unknown',
    value: Number(metric?.value) || 0,
  };
}

function postWebVital(metric) {
  if (!TRACKED_METRICS.has(metric?.name)) {
    return;
  }
}

function WebVitals() {
  useReportWebVitals(postWebVital);

  return null;
}

function AccountRouteNavGuard() {
  const pathname = usePathname();
  const { register, unregister } = useNavRegistryActions();

  useEffect(() => {
    if (pathname?.startsWith('/account')) {
      unregister('/account', 'static');
      return;
    }

    register('/account', NAV_CONFIG.items.profile, 'static', { priority: 100 });
  }, [pathname, register, unregister]);

  return null;
}

export const AppProviders = ({ children }) => {
  const pathname = usePathname();
  const enableSmoothScroll = shouldEnableSmoothScroll(pathname);

  return (
    <>
      <WebVitals />
      <CoreShellProviders>
        <AccountRouteNavGuard />
        <PersistentInteractiveShell>
          <BackgroundOverlay />
          <LoadingOverlay />
          <Nav />
          <GlobalError>
            {enableSmoothScroll ? (
              <SmoothScrollProvider>{children}</SmoothScrollProvider>
            ) : (
              children
            )}
          </GlobalError>
        </PersistentInteractiveShell>
      </CoreShellProviders>
    </>
  );
};
