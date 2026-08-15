'use client';

import { useEffect } from 'react';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { accentChain } from 'glimm';
import { GlimmProvider } from 'glimm/next';

import { NAV_RUNTIME } from '@/app/_shell/nav-runtime';
import { NAV_CONFIG } from '@/app/_shell/navigation-config';
import { RouteTransitionInterceptor } from '@/app/_shell/route-transition-interceptor';
import { SmoothScrollProvider } from '@/app/_shell/smooth-scroll';
import { pipe } from '@/shared/utils';
import { RouteTransitionCoordinator } from '@/shared/route-transition-coordinator';

import { BackgroundOverlay, BackgroundProvider } from '@/modules/background';
import { AuthProvider, createSupabaseAuthAdapter } from '@/modules/auth';
import { GlobalError } from '@/modules/error-boundary';
import { LoadingOverlay, LoadingProvider } from '@/modules/loading';
import { ModalProvider } from '@/modules/modal';
import { NavigationProvider } from '@/modules/nav/context';
import {
  RegistryBootstrap,
  REGISTRY_TYPES,
  RegistryProvider,
  useNavRegistryActions,
} from '@/modules/registry';
import {
  createClient as createSupabaseClient,
  terminateBrowserSession,
} from '@/infrastructure/supabase/supabase-client';

const Nav = dynamic(() => import('@/modules/nav'));
const STATIC_NAV_ITEMS = Object.freeze(
  Object.fromEntries(Object.values(NAV_CONFIG.items).map((item) => [item.path || item.name, item])),
);

const APP_REGISTRY_ENTRIES = Object.freeze([
  {
    type: REGISTRY_TYPES.NAV,
    items: STATIC_NAV_ITEMS,
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

const APP_AUTH_CONFIG = {
  adapter: createSupabaseAuthAdapter({
    client: () => createSupabaseClient(),
    oauthDefaultNextPath: '/account',
    terminateBrowserSession,
  }),
  hydrateFromStorage: false,
  persistSession: false,
};

const GLIMM_MONOCHROME_PALETTE = accentChain(['#F7F7F5', '#8D8D89', '#0A0B0C']);

const GLIMM_SWEEP = Object.freeze({
  bandTight: 9,
  brightness: 0.82,
  direction: 'ltr',
  easing: 'easeInOutCubic',
  midpoint: 0.58,
  outroMs: 620,
  palette: {
    a: [0.49, 0.54, 0.85],
    b: [0.59, 0.41, 0.77],
    c: [0.5, 0.5, 0.5],
    d: [0.86, 0.61, 0.28],
  },
  peakAlpha: 0.76,
  rippleAmount: 0.16,
  sweepMs: 1350,
  swellAmount: 0.2,
  waveAmount: 0,
  waveSpeed: 0.8,
});

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
  [AuthProvider, { config: APP_AUTH_CONFIG }],
  [ModalProvider],
);

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
  return (
    <GlimmProvider reducedMotion="instant" zIndex={1000} {...GLIMM_SWEEP}>
      <RouteTransitionCoordinator>
        <RouteTransitionInterceptor />
        <CoreShellProviders>
          <AccountRouteNavGuard />
          <BackgroundOverlay />
          <LoadingOverlay />
          <Nav />
          <SmoothScrollProvider>
            <GlobalError>{children}</GlobalError>
          </SmoothScrollProvider>
        </CoreShellProviders>
      </RouteTransitionCoordinator>
    </GlimmProvider>
  );
};
