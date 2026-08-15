'use client';

import { useEffect } from 'react';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';

import { NAV_RUNTIME } from '@/app/_shell/nav-runtime';
import { NAV_CONFIG } from '@/app/_shell/navigation-config';
import { SmoothScrollProvider } from '@/app/_shell/smooth-scroll';
import { pipe } from '@/shared/utils';

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
    <TooltipPrimitive.Provider delayDuration={150} skipDelayDuration={300} disableHoverableContent>
      <CoreShellProviders>
        <AccountRouteNavGuard />
        <BackgroundOverlay />
        <LoadingOverlay />
        <Nav />
        <SmoothScrollProvider>
          <GlobalError>{children}</GlobalError>
        </SmoothScrollProvider>
      </CoreShellProviders>
    </TooltipPrimitive.Provider>
  );
};
