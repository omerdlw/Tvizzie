'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { MotionConfig } from 'framer-motion';

import { NAV_RUNTIME } from '@/app/_shell/nav-runtime';
import { NAV_CONFIG } from '@/app/_shell/navigation-config';
import { SmoothScrollProvider } from '@/app/_shell/smooth-scroll';
import { composeProviders } from '@/app/_shell/compose-providers';

import { BackgroundOverlay, BackgroundProvider } from '@/modules/background';
import { AuthProvider, createSupabaseAuthAdapter, useAuth } from '@/modules/auth';
import { getUserAvatarUrl } from '@/domains/account/utils/avatar';
import { subscribeToUserAccount } from '@/domains/account/client/profile';
import { GlobalError } from '@/modules/error-boundary';
import { LoadingOverlay, LoadingProvider } from '@/modules/loading';
import { ModalProvider } from '@/modules/modal';
import { NavigationProvider } from '@/modules/nav';
import { useNavigationActions } from '@/modules/nav';
import { NotificationContainer, NotificationProvider, useToast } from '@/modules/notification';
import { resolveSignInNoticeToast, sanitizeNextPath } from '@/domains/auth/utils/routes';
import { createSignInSurfaceEntry } from '@/domains/shell/navigation/surfaces/sign-in-surface';
import { createSignUpSurfaceEntry } from '@/domains/shell/navigation/surfaces/sign-up-surface';
import {
  RegistryBootstrap,
  REGISTRY_TYPES,
  RegistryProvider,
  useNavRegistryActions,
} from '@/modules/registry';
import {
  createClient as createSupabaseClient,
  terminateBrowserSession,
} from '@/infrastructure/supabase/client';

const Nav = dynamic(() => import('@/modules/nav'));
const NotificationsModal = dynamic(() => import('@/domains/shell/modals/notifications-modal'), {
  ssr: false,
});
const STATIC_NAV_ITEMS = Object.freeze(
  Object.fromEntries(
    Object.values(NAV_CONFIG.items)
      .filter((item) => item.path !== '/account')
      .map((item) => [item.path || item.name, item]),
  ),
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
  {
    type: REGISTRY_TYPES.MODAL,
    items: {
      NOTIFICATIONS_MODAL: NotificationsModal,
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

const CoreShellProviders = composeProviders(
  [RegistryProvider],
  [AppRegistryBootstrap],
  [BackgroundProvider],
  [NavigationProvider],
  [LoadingProvider],
  [AuthProvider, { config: APP_AUTH_CONFIG }],
  [ModalProvider],
  [NotificationProvider],
);

function AccountRouteNavGuard() {
  const { register, unregister } = useNavRegistryActions();
  const auth = useAuth();
  const pathname = usePathname();
  const isAccountSubroute = String(pathname || '').startsWith('/account/');
  const userId = auth.isAuthenticated ? auth.user?.id || null : null;
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    if (!userId) {
      setProfile(null);
      return;
    }

    const unsubscribe = subscribeToUserAccount(userId, (nextProfile) => {
      if (nextProfile) {
        setProfile(nextProfile);
      }
    });

    return () => {
      unsubscribe?.();
    };
  }, [userId]);

  const activeUser = profile || auth.user;
  const displayName =
    profile?.displayName ||
    profile?.display_name ||
    auth.user?.name ||
    auth.user?.displayName ||
    auth.user?.metadata?.display_name ||
    'Account';
  const rawUsername =
    profile?.username || auth.user?.metadata?.username || auth.user?.username || null;
  const username = rawUsername ? `@${String(rawUsername).replace(/^@/, '')}` : null;
  const avatarUrl = activeUser ? getUserAvatarUrl(activeUser) : NAV_CONFIG.items.profile.icon;

  const accountNavItem = useMemo(() => {
    if (!auth.isAuthenticated) {
      return NAV_CONFIG.items.profile;
    }

    return {
      ...NAV_CONFIG.items.profile,
      title: displayName,
      description: username || NAV_CONFIG.items.profile.description,
      icon: avatarUrl,
    };
  }, [auth.isAuthenticated, displayName, username, avatarUrl]);

  useEffect(() => {
    if (isAccountSubroute || !auth.isReady) {
      unregister('/account', 'static');
      return;
    }

    register('/account', accountNavItem, 'static', { priority: 100 });
  }, [auth.isReady, isAccountSubroute, register, unregister, accountNavItem]);

  return null;
}

function AuthSurfaceReturnBridge() {
  const { openSurface } = useNavigationActions();
  const toast = useToast();

  useEffect(() => {
    const url = new URL(window.location.href);
    const authSurface = url.searchParams.get('auth');

    if (authSurface !== 'sign-in' && authSurface !== 'sign-up') return;

    const data = {
      email: url.searchParams.get('email') || '',
      identifier: url.searchParams.get('identifier') || '',
      next: sanitizeNextPath(url.searchParams.get('next')),
    };
    const notice = url.searchParams.get('notice');
    const provider = url.searchParams.get('provider');
    const noticeToast = resolveSignInNoticeToast(notice, provider);

    ['auth', 'email', 'identifier', 'next', 'notice', 'provider'].forEach((key) => {
      url.searchParams.delete(key);
    });
    window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);

    if (noticeToast) {
      toast[noticeToast.type]?.(noticeToast.message);
    }

    void openSurface(
      authSurface === 'sign-up' ? createSignUpSurfaceEntry(data) : createSignInSurfaceEntry(data),
    );
  }, [openSurface, toast]);

  return null;
}

export const AppProviders = ({ children }) => {
  return (
    <MotionConfig reducedMotion="user">
      <TooltipPrimitive.Provider
        delayDuration={150}
        skipDelayDuration={300}
        disableHoverableContent
      >
        <CoreShellProviders>
          <AccountRouteNavGuard />
          <AuthSurfaceReturnBridge />
          <BackgroundOverlay />
          <LoadingOverlay />
          <Nav />
          <NotificationContainer />
          <SmoothScrollProvider>
            <GlobalError>{children}</GlobalError>
          </SmoothScrollProvider>
        </CoreShellProviders>
      </TooltipPrimitive.Provider>
    </MotionConfig>
  );
};
